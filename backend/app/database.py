from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import get_settings

settings = get_settings()

_is_sqlite = "sqlite" in settings.async_database_url

_kwargs = {"echo": settings.DEBUG}
if not _is_sqlite:
    _kwargs.update(pool_size=20, max_overflow=10, pool_pre_ping=True, pool_recycle=3600)

engine = create_async_engine(settings.async_database_url, **_kwargs)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    async with engine.begin() as conn:
        if not _is_sqlite:
            # Serialize schema creation across uvicorn workers: without this,
            # concurrent create_all calls race on PostgreSQL and crash workers
            # with UniqueViolationError on pg_type. Transaction-scoped, so the
            # lock is released automatically at the end of the block.
            await conn.execute(text("SELECT pg_advisory_xact_lock(918273645)"))
        await conn.run_sync(Base.metadata.create_all)


async def close_db():
    await engine.dispose()

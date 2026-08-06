import os
import asyncio
from typing import AsyncGenerator

os.environ["DATABASE_URL"] = "sqlite+aiosqlite://"
os.environ["SECRET_KEY"] = "test-secret-key-for-testing"
os.environ["ENVIRONMENT"] = "test"
os.environ["DEBUG"] = "true"

os.environ.pop("DATABASE_URL_SYNC", None)

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import StaticPool
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.config import get_settings as _get_settings

_get_settings.cache_clear()

from app.database import Base, get_db
from app.models.user import User
from app.models.complaint import Complaint, ComplaintVote, ComplaintUpdate
from app.models.audit import RefreshToken
from app.models.notification import Notification
from app.services.auth_service import AuthService
from app.routers import auth, complaints, admin, analytics, notifications, uploads, users, chat, websocket, demo

from fastapi import FastAPI

test_settings = _get_settings()
test_settings.DATABASE_URL = "sqlite+aiosqlite://"
test_settings.SECRET_KEY = "test-secret-key-for-testing"


def create_app() -> FastAPI:
    app = FastAPI()
    app.include_router(auth.router)
    app.include_router(complaints.router)
    app.include_router(admin.router)
    app.include_router(analytics.router)
    app.include_router(notifications.router)
    app.include_router(uploads.router)
    app.include_router(users.router)
    app.include_router(chat.router)
    app.include_router(websocket.router)
    app.include_router(demo.router)
    return app


app = create_app()

test_engine = create_async_engine(
    "sqlite+aiosqlite://",
    echo=False,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
test_async_session_factory = async_sessionmaker(
    test_engine, class_=AsyncSession, expire_on_commit=False
)


async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
    async with test_async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


app.dependency_overrides[get_db] = override_get_db

import app.database as _db_module
_db_module.async_session_factory = test_async_session_factory
import app.routers.websocket as _ws_module
_ws_module.async_session_factory = test_async_session_factory

__all__ = [
    "app",
    "test_async_session_factory",
    "test_engine",
]



@pytest_asyncio.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(autouse=True)
async def test_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest_asyncio.fixture
async def test_user() -> User:
    async with test_async_session_factory() as db:
        user = User(
            email="citizen@example.com",
            username="testcitizen",
            hashed_password=AuthService.hash_password("TestPass123"),
            full_name="Test Citizen",
            phone="1234567890",
            ward_number=5,
            village="TestVillage",
            district="TestDistrict",
            state="TestState",
            role="citizen",
            is_verified=True,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user


@pytest_asyncio.fixture
async def test_admin() -> User:
    async with test_async_session_factory() as db:
        admin_user = User(
            email="admin@example.com",
            username="testadmin",
            hashed_password=AuthService.hash_password("AdminPass123"),
            full_name="Test Admin",
            phone="9876543210",
            ward_number=1,
            village="AdminVillage",
            district="AdminDistrict",
            state="AdminState",
            role="admin",
            is_verified=True,
        )
        db.add(admin_user)
        await db.commit()
        await db.refresh(admin_user)
        return admin_user


@pytest_asyncio.fixture
async def auth_headers(test_user: User) -> dict:
    token = AuthService.create_access_token(data={"sub": test_user.id})
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def admin_headers(test_admin: User) -> dict:
    token = AuthService.create_access_token(data={"sub": test_admin.id})
    return {"Authorization": f"Bearer {token}"}

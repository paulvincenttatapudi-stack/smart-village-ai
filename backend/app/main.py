import os
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from loguru import logger

from app.config import get_settings
from app.database import init_db, close_db
from app.middleware import LoggingMiddleware, SecurityHeadersMiddleware
from app.routers import auth, complaints, admin, analytics, notifications, uploads, users, chat, websocket, metrics, demo


settings = get_settings()

logger.remove()
log_level = settings.LOG_LEVEL.upper()
logger.add(sys.stderr, level=log_level, format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <level>{message}</level>")
try:
    os.makedirs(os.path.dirname(settings.LOG_FILE), exist_ok=True)
    logger.add(settings.LOG_FILE, level=log_level, rotation="10 MB", retention="30 days", compression="gz")
except Exception:
    pass

limiter = Limiter(key_func=get_remote_address, default_limits=[f"{settings.RATE_LIMIT_PER_MINUTE}/minute"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting {} v{}", settings.APP_NAME, settings.APP_VERSION)
    await init_db()
    logger.info("Database initialized")
    yield
    logger.info("Shutting down")
    await close_db()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(LoggingMiddleware)

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception: {} {}", type(exc).__name__, exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


app.include_router(auth.router)
app.include_router(complaints.router)
app.include_router(admin.router)
app.include_router(analytics.router)
app.include_router(notifications.router)
app.include_router(uploads.router)
app.include_router(users.router)
app.include_router(chat.router)
app.include_router(websocket.router)
app.include_router(metrics.router)
app.include_router(demo.router)


@app.get("/")
async def root():
    return {"message": "Smart Village AI Platform API", "version": settings.APP_VERSION}

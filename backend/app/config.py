from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from typing import List, Optional
import os


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

    APP_NAME: str = "Smart Village AI Platform"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "production"

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/smart_village"
    DATABASE_URL_SYNC: str = "postgresql://postgres:postgres@localhost:5432/smart_village"

    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    SECRET_KEY: str = "change-this-to-a-very-long-random-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    UPLOAD_DIR: str = "static/uploads"
    MAX_UPLOAD_SIZE_MB: int = 10
    ALLOWED_IMAGE_EXTENSIONS: str = ".jpg,.jpeg,.png,.gif,.webp"
    ALLOWED_AUDIO_EXTENSIONS: str = ".mp3,.wav,.ogg,.m4a"
    ALLOWED_DOCUMENT_EXTENSIONS: str = ".pdf,.doc,.docx"

    STORAGE_BACKEND: str = "local"
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: str = "us-east-1"
    AWS_S3_BUCKET: Optional[str] = None
    CLOUDINARY_CLOUD_NAME: Optional[str] = None
    CLOUDINARY_API_KEY: Optional[str] = None
    CLOUDINARY_API_SECRET: Optional[str] = None

    AI_MODEL_CACHE_DIR: str = "./models"
    ENABLE_GPU: bool = False
    DUPLICATE_RADIUS_METERS: float = 500.0
    SIMILARITY_THRESHOLD: float = 0.75

    RATE_LIMIT_PER_MINUTE: int = 60
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/app.log"

    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    EMAIL_FROM: str = "noreply@smartvillage.gov"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    @property
    def allowed_image_extensions_set(self) -> set:
        return set(self.ALLOWED_IMAGE_EXTENSIONS.split(","))

    @property
    def allowed_audio_extensions_set(self) -> set:
        return set(self.ALLOWED_AUDIO_EXTENSIONS.split(","))

    @property
    def allowed_document_extensions_set(self) -> set:
        return set(self.ALLOWED_DOCUMENT_EXTENSIONS.split(","))

    @property
    def max_upload_size_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024


@lru_cache()
def get_settings() -> Settings:
    return Settings()

import os
import uuid
from abc import ABC, abstractmethod
from pathlib import Path

import aiofiles
from fastapi import HTTPException, UploadFile, status
from loguru import logger

from app.config import get_settings

settings = get_settings()

MAGIC_BYTES = {
    "images": {
        b"\xff\xd8\xff": "image/jpeg",
        b"\x89PNG": "image/png",
        b"GIF87a": "image/gif",
        b"GIF89a": "image/gif",
        b"RIFF": "image/webp",
    },
    "voices": {
        b"ID3": "audio/mpeg",
        b"\xff\xfb": "audio/mpeg",
        b"\xff\xf3": "audio/mpeg",
        b"OggS": "audio/ogg",
        b"fLaC": "audio/flac",
    },
    "documents": {
        b"%PDF": "application/pdf",
        b"PK": "application/zip",
    },
}


class StorageService(ABC):
    @abstractmethod
    async def save(self, file: bytes, path: str) -> str:
        ...

    @abstractmethod
    async def delete(self, path: str) -> bool:
        ...


class LocalStorageService(StorageService):
    def __init__(self):
        self.base_dir = Path(settings.UPLOAD_DIR)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    async def save(self, file: bytes, path: str) -> str:
        full_path = self.base_dir / path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        async with aiofiles.open(full_path, "wb") as f:
            await f.write(file)
        return f"/uploads/{path}"

    async def delete(self, path: str) -> bool:
        full_path = self.base_dir / path
        if full_path.exists():
            full_path.unlink()
            return True
        return False


class S3StorageService(StorageService):
    async def save(self, file: bytes, path: str) -> str:
        return f"s3://{settings.AWS_S3_BUCKET}/{path}"

    async def delete(self, path: str) -> bool:
        return True


class CloudinaryStorageService(StorageService):
    async def save(self, file: bytes, path: str) -> str:
        return f"cloudinary://{path}"

    async def delete(self, path: str) -> bool:
        return True


def get_storage_service() -> StorageService:
    backend = settings.STORAGE_BACKEND
    if backend == "local":
        return LocalStorageService()
    elif backend == "s3":
        return S3StorageService()
    elif backend == "cloudinary":
        return CloudinaryStorageService()
    raise ValueError(f"Unknown storage backend: {backend}")


ALLOWED_EXTENSIONS = {
    "images": settings.allowed_image_extensions_set,
    "voices": settings.allowed_audio_extensions_set,
    "documents": settings.allowed_document_extensions_set,
}


def validate_magic_bytes(content: bytes, subdir: str) -> bool:
    if subdir not in MAGIC_BYTES:
        return True
    for magic, _mime in MAGIC_BYTES[subdir].items():
        if content[:len(magic)] == magic:
            return True
    return False


async def save_upload_file(upload_file: UploadFile, subdir: str) -> str:
    if subdir not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid subdir: {subdir}")

    ext = os.path.splitext(upload_file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS[subdir]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File extension '{ext}' not allowed for {subdir}. Allowed: {', '.join(ALLOWED_EXTENSIONS[subdir])}",
        )

    content = await upload_file.read()
    if len(content) > settings.max_upload_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds maximum of {settings.MAX_UPLOAD_SIZE_MB}MB",
        )

    if len(content) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is too small to be a valid file",
        )

    if not validate_magic_bytes(content, subdir):
        logger.warning("MIME mismatch: file={} ext={} subdir={}", upload_file.filename, ext, subdir)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File content does not match expected type for {subdir}",
        )

    unique_name = f"{uuid.uuid4().hex}{ext}"
    path = f"{subdir}/{unique_name}"

    storage = get_storage_service()
    return await storage.save(content, path)

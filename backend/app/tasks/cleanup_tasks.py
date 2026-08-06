import os
import shutil
from datetime import datetime, timedelta, timezone

from loguru import logger
from sqlalchemy import delete, select
from asgiref.sync import async_to_sync

from app.tasks.celery_app import celery_app
from app.database import async_session_factory
from app.models.audit import RefreshToken
from app.models.notification import Notification


@celery_app.task
def cleanup_expired_tokens():
    logger.info("Starting expired token cleanup")

    async def _run():
        async with async_session_factory() as db:
            now = datetime.now(timezone.utc)
            result = await db.execute(
                select(RefreshToken).where(
                    RefreshToken.expires_at < now,
                    RefreshToken.is_revoked == False,
                )
            )
            expired = list(result.scalars().all())
            count = len(expired)
            for token in expired:
                token.is_revoked = True
            await db.commit()
            logger.info(f"Revoked {count} expired refresh tokens")

    try:
        async_to_sync(_run)()
    except Exception as exc:
        logger.error(f"Token cleanup failed: {exc}")


@celery_app.task
def cleanup_old_notifications(days: int = 90):
    logger.info(f"Starting cleanup of notifications older than {days} days")

    async def _run():
        async with async_session_factory() as db:
            cutoff = datetime.now(timezone.utc) - timedelta(days=days)
            result = await db.execute(
                select(Notification).where(Notification.created_at < cutoff)
            )
            old = list(result.scalars().all())
            count = len(old)
            for notification in old:
                await db.delete(notification)
            await db.commit()
            logger.info(f"Deleted {count} old notifications")

    try:
        async_to_sync(_run)()
    except Exception as exc:
        logger.error(f"Notification cleanup failed: {exc}")


@celery_app.task
def cleanup_temp_files(hours: int = 24):
    logger.info(f"Starting cleanup of temp files older than {hours} hours")

    temp_dirs = ["/tmp/opencode", "static/uploads/temp"]

    for directory in temp_dirs:
        try:
            if not os.path.exists(directory):
                continue

            cutoff = datetime.now().timestamp() - (hours * 3600)
            removed = 0

            for root, dirs, files in os.walk(directory):
                for name in files:
                    filepath = os.path.join(root, name)
                    try:
                        stat = os.stat(filepath)
                        if stat.st_mtime < cutoff:
                            os.remove(filepath)
                            removed += 1
                    except OSError as e:
                        logger.warning(f"Could not remove {filepath}: {e}")

                for name in dirs:
                    dirpath = os.path.join(root, name)
                    try:
                        stat = os.stat(dirpath)
                        if stat.st_mtime < cutoff:
                            shutil.rmtree(dirpath, ignore_errors=True)
                            removed += 1
                    except OSError as e:
                        logger.warning(f"Could not remove directory {dirpath}: {e}")

            if removed:
                logger.info(f"Removed {removed} temp files from {directory}")
        except Exception as e:
            logger.error(f"Temp cleanup failed for {directory}: {e}")

    logger.info("Temp file cleanup completed")

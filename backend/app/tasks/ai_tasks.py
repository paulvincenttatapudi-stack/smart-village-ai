from loguru import logger
from asgiref.sync import async_to_sync

from app.tasks.celery_app import celery_app
from app.database import async_session_factory
from app.models.complaint import Complaint
from app.services.ai_service import AIService
from sqlalchemy import select


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def analyze_complaint_task(self, complaint_id: int):
    logger.info(f"Starting AI analysis for complaint #{complaint_id}")

    async def _run():
        async with async_session_factory() as db:
            result = await db.execute(
                select(Complaint).where(Complaint.id == complaint_id)
            )
            complaint = result.scalar_one_or_none()
            if not complaint:
                logger.error(f"Complaint #{complaint_id} not found")
                return

            ai_service = AIService()
            await ai_service.analyze_complaint(db, complaint)
            logger.info(f"AI analysis completed for complaint #{complaint_id}")

    try:
        async_to_sync(_run)()
    except Exception as exc:
        logger.error(f"AI analysis failed for complaint #{complaint_id}: {exc}")
        raise self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=2, default_retry_delay=120)
def analyze_image_task(self, complaint_id: int, image_path: str):
    logger.info(f"Starting image analysis for complaint #{complaint_id}, image: {image_path}")

    async def _run():
        async with async_session_factory() as db:
            from app.services.image_analysis_service import ImageAnalysisService

            result = await db.execute(
                select(Complaint).where(Complaint.id == complaint_id)
            )
            complaint = result.scalar_one_or_none()
            if not complaint:
                logger.error(f"Complaint #{complaint_id} not found")
                return

            service = ImageAnalysisService()
            await service.analyze_image(db, complaint, image_path)
            logger.info(f"Image analysis completed for complaint #{complaint_id}")

    try:
        async_to_sync(_run)()
    except Exception as exc:
        logger.error(f"Image analysis failed for complaint #{complaint_id}: {exc}")
        raise self.retry(exc=exc)


@celery_app.task
def batch_classify_pending_complaints():
    logger.info("Starting batch classification of pending complaints")

    async def _run():
        async with async_session_factory() as db:
            result = await db.execute(
                select(Complaint).where(Complaint.ai_category.is_(None))
            )
            complaints = list(result.scalars().all())
            logger.info(f"Found {len(complaints)} unprocessed complaints")

            ai_service = AIService()
            for complaint in complaints:
                try:
                    await ai_service.analyze_complaint(db, complaint)
                    logger.info(f"Batch classified complaint #{complaint.id}")
                except Exception as e:
                    logger.error(f"Failed to classify complaint #{complaint.id}: {e}")

    try:
        async_to_sync(_run)()
    except Exception as exc:
        logger.error(f"Batch classification failed: {exc}")

from celery import Celery

from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "smart_village",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,
    task_soft_time_limit=240,
    worker_max_tasks_per_child=100,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    beat_schedule={
        "batch-classify-pending-complaints": {
            "task": "app.tasks.ai_tasks.batch_classify_pending_complaints",
            "schedule": 300.0,
        },
        "cleanup-expired-tokens": {
            "task": "app.tasks.cleanup_tasks.cleanup_expired_tokens",
            "schedule": 3600.0,
        },
        "cleanup-old-notifications": {
            "task": "app.tasks.cleanup_tasks.cleanup_old_notifications",
            "schedule": 86400.0,
        },
        "cleanup-temp-files": {
            "task": "app.tasks.cleanup_tasks.cleanup_temp_files",
            "schedule": 43200.0,
        },
    },
)

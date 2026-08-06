from loguru import logger
from asgiref.sync import async_to_sync

from app.tasks.celery_app import celery_app
from app.database import async_session_factory
from app.models.notification import Notification
from app.models.complaint import Complaint
from sqlalchemy import select


@celery_app.task(bind=True, max_retries=3, default_retry_delay=30)
def send_email_notification(self, user_id: int, subject: str, body: str):
    logger.info(f"Sending email to user #{user_id}: {subject}")
    try:
        from app.config import get_settings

        settings = get_settings()
        if not settings.SMTP_HOST:
            logger.warning("SMTP not configured, skipping email")
            return

        import smtplib
        from email.mime.text import MIMEText

        async def _get_user_email():
            async with async_session_factory() as db:
                from app.models.user import User
                result = await db.execute(select(User).where(User.id == user_id))
                user = result.scalar_one_or_none()
                return user.email if user else None

        email = async_to_sync(_get_user_email)()
        if not email:
            logger.error(f"User #{user_id} not found for email notification")
            return

        msg = MIMEText(body, "plain", "utf-8")
        msg["Subject"] = subject
        msg["From"] = settings.EMAIL_FROM
        msg["To"] = email

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)

        logger.info(f"Email sent to {email} ({subject})")
    except Exception as exc:
        logger.error(f"Failed to send email to user #{user_id}: {exc}")
        raise self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=30)
def send_push_notification(self, user_id: int, title: str, message: str):
    logger.info(f"Sending push notification to user #{user_id}: {title}")
    try:
        from firebase_admin import messaging, initialize_app, credentials
        import firebase_admin

        if not firebase_admin._apps:
            logger.warning("Firebase not initialized, skipping push notification")
            return

        async def _get_user_device_token():
            async with async_session_factory() as db:
                from app.models.user import User
                result = await db.execute(select(User).where(User.id == user_id))
                user = result.scalar_one_or_none()
                return getattr(user, "fcm_token", None) if user else None

        token = async_to_sync(_get_user_device_token)()
        if not token:
            logger.warning(f"No device token for user #{user_id}")
            return

        msg = messaging.Message(
            notification=messaging.Notification(title=title, body=message),
            token=token,
        )
        response = messaging.send(msg)
        logger.info(f"Push notification sent to user #{user_id}: {response}")
    except Exception as exc:
        logger.error(f"Failed to send push notification to user #{user_id}: {exc}")
        raise self.retry(exc=exc)


@celery_app.task
def notify_assigned_officer(complaint_id: int, assigned_to: int):
    logger.info(f"Notifying officer #{assigned_to} about complaint #{complaint_id}")

    async def _run():
        async with async_session_factory() as db:
            result = await db.execute(
                select(Complaint).where(Complaint.id == complaint_id)
            )
            complaint = result.scalar_one_or_none()
            if not complaint:
                logger.error(f"Complaint #{complaint_id} not found")
                return

            notification = Notification(
                user_id=assigned_to,
                title="New Complaint Assigned",
                message=f"Complaint '{complaint.title}' has been assigned to you.",
                type="assignment",
                complaint_id=complaint_id,
            )
            db.add(notification)
            await db.commit()
            logger.info(
                f"Notification created for officer #{assigned_to} "
                f"about complaint #{complaint_id}"
            )

    try:
        async_to_sync(_run)()
    except Exception as exc:
        logger.error(f"Failed to notify officer #{assigned_to}: {exc}")

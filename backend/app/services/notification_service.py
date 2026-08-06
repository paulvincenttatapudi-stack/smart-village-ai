from typing import Optional

from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification


class NotificationService:
    @staticmethod
    async def create_notification(
        db: AsyncSession,
        user_id: int,
        title: str,
        message: str,
        type: str = "info",
        complaint_id: Optional[int] = None,
    ) -> Notification:
        notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            type=type,
            complaint_id=complaint_id,
        )
        db.add(notification)
        await db.flush()
        await db.refresh(notification)
        return notification

    @staticmethod
    async def get_user_notifications(db: AsyncSession, user_id: int, limit: int = 50) -> list[Notification]:
        result = await db.execute(
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(desc(Notification.created_at))
            .limit(limit)
        )
        return list(result.scalars().all())

    @staticmethod
    async def mark_as_read(db: AsyncSession, notification_id: int, user_id: int) -> None:
        result = await db.execute(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
        )
        notification = result.scalar_one_or_none()
        if notification:
            notification.is_read = True
            await db.flush()

    @staticmethod
    async def mark_all_as_read(db: AsyncSession, user_id: int) -> None:
        result = await db.execute(
            select(Notification).where(
                Notification.user_id == user_id,
                Notification.is_read == False,
            )
        )
        notifications = list(result.scalars().all())
        for n in notifications:
            n.is_read = True
        await db.flush()

    @staticmethod
    async def get_unread_count(db: AsyncSession, user_id: int) -> int:
        result = await db.execute(
            select(func.count(Notification.id)).where(
                Notification.user_id == user_id,
                Notification.is_read == False,
            )
        )
        return result.scalar() or 0

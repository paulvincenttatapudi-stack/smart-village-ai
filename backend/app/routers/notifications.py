from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.notification import NotificationResponse
from app.services.auth_service import AuthService
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationResponse])
async def get_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_user),
):
    notifications = await NotificationService.get_user_notifications(db, current_user.id)
    return [NotificationResponse.model_validate(n) for n in notifications]


@router.put("/{notification_id}/read", response_model=dict)
async def mark_notification_read(
    notification_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_user),
):
    await NotificationService.mark_as_read(db, notification_id, current_user.id)
    return {"message": "Notification marked as read"}


@router.put("/read-all", response_model=dict)
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_user),
):
    await NotificationService.mark_all_as_read(db, current_user.id)
    return {"message": "All notifications marked as read"}


@router.get("/unread-count", response_model=dict)
async def get_unread_count(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_user),
):
    count = await NotificationService.get_unread_count(db, current_user.id)
    return {"unread_count": count}

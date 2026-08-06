from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate, UserProfileResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/profile", response_model=UserProfileResponse)
async def get_profile(current_user: User = Depends(AuthService.get_current_user)):
    return UserProfileResponse.model_validate(current_user)


@router.put("/profile", response_model=UserProfileResponse)
async def update_profile(
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_user),
):
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(current_user, field, value)
    await db.flush()
    await db.refresh(current_user)
    logger.info("Profile updated: user_id={} fields={}", current_user.id, list(update_data.keys()))
    return UserProfileResponse.model_validate(current_user)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user: User = Depends(AuthService.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserResponse.model_validate(user)

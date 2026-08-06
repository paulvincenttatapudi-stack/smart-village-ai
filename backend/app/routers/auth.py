from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.config import get_settings
from app.database import get_db
from app.models.user import User
from app.models.audit import RefreshToken
from app.schemas.user import UserCreate, UserResponse
from app.schemas.auth import TokenResponse, TokenRefreshRequest, PasswordChangeRequest, LogoutRequest
from app.services.auth_service import AuthService

router = APIRouter(prefix="/api/auth", tags=["auth"])
settings = get_settings()


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=1, max_length=128)


@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
async def register(request: Request, user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    logger.info("Registration attempt for email={}", user_data.email)
    user = await AuthService.create_user(db, user_data)
    access_token = AuthService.create_access_token(data={"sub": user.id})
    refresh_token = AuthService.create_refresh_token(data={"sub": user.id})
    refresh_expires = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    refresh_record = RefreshToken(user_id=user.id, token=refresh_token, expires_at=refresh_expires)
    db.add(refresh_record)
    logger.info("User registered: id={} email={}", user.id, user.email)
    return {
        "user": UserResponse.model_validate(user),
        "tokens": TokenResponse(access_token=access_token, refresh_token=refresh_token),
    }


@router.post("/login", response_model=TokenResponse)
async def login(
    request: Request,
    credentials: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    logger.info("Login attempt for username={}", credentials.username)
    user = await AuthService.authenticate_user(db, credentials.username, credentials.password)
    access_token = AuthService.create_access_token(data={"sub": user.id})
    refresh_token = AuthService.create_refresh_token(data={"sub": user.id})
    refresh_expires = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    refresh_record = RefreshToken(user_id=user.id, token=refresh_token, expires_at=refresh_expires)
    db.add(refresh_record)
    logger.info("User logged in: id={} email={}", user.id, user.email)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(body: TokenRefreshRequest, db: AsyncSession = Depends(get_db)):
    payload = AuthService.decode_token(body.refresh_token)
    user_id: int = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    result = await db.execute(select(RefreshToken).where(RefreshToken.token == body.refresh_token))
    stored = result.scalar_one_or_none()
    if not stored:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token not found")
    if stored.is_revoked:
        logger.warning("Revoked refresh token used: user_id={}", user_id)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token has been revoked")
    if stored.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token has expired")
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    access_token = AuthService.create_access_token(data={"sub": user.id})
    new_refresh_token = AuthService.create_refresh_token(data={"sub": user.id})
    stored.is_revoked = True
    refresh_expires = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    new_record = RefreshToken(user_id=user.id, token=new_refresh_token, expires_at=refresh_expires)
    db.add(new_record)
    return TokenResponse(access_token=access_token, refresh_token=new_refresh_token)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(AuthService.get_current_user)):
    return UserResponse.model_validate(current_user)


@router.put("/change-password", response_model=dict)
async def change_password(
    body: PasswordChangeRequest,
    current_user: User = Depends(AuthService.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not AuthService.verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    current_user.hashed_password = AuthService.hash_password(body.new_password)
    logger.info("Password changed: user_id={}", current_user.id)
    return {"message": "Password changed successfully"}


@router.post("/logout", response_model=dict)
async def logout(
    body: LogoutRequest,
    current_user: User = Depends(AuthService.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(RefreshToken).where(RefreshToken.token == body.refresh_token))
    stored = result.scalar_one_or_none()
    if stored and stored.user_id == current_user.id:
        stored.is_revoked = True
    logger.info("User logged out: user_id={}", current_user.id)
    return {"message": "Logged out successfully"}

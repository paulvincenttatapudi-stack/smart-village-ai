from datetime import datetime, timedelta, timezone
from typing import Optional
import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


class AuthService:
    @staticmethod
    def hash_password(password: str) -> str:
        return pwd_context.hash(password)

    @staticmethod
    def verify_password(plain: str, hashed: str) -> bool:
        return pwd_context.verify(plain, hashed)

    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        to_encode = data.copy()
        if "sub" in to_encode:
            to_encode["sub"] = str(to_encode["sub"])
        expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
        to_encode.update({"exp": expire})
        return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    @staticmethod
    def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        to_encode = data.copy()
        if "sub" in to_encode:
            to_encode["sub"] = str(to_encode["sub"])
        to_encode["jti"] = str(uuid.uuid4())
        expire = datetime.now(timezone.utc) + (expires_delta or timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS))
        to_encode.update({"exp": expire})
        return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    @staticmethod
    def decode_token(token: str) -> dict:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            return payload
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            )

    @staticmethod
    async def authenticate_user(db: AsyncSession, username: str, password: str) -> User:
        result = await db.execute(
            select(User).where(
                (User.username == username) | (User.email == username)
            )
        )
        user = result.scalar_one_or_none()
        if not user or not AuthService.verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated")
        return user

    @staticmethod
    async def create_user(db: AsyncSession, user_data: UserCreate) -> User:
        existing = await db.execute(
            select(User).where((User.email == user_data.email) | (User.username == user_data.username))
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email or username already registered")

        user = User(
            email=user_data.email,
            username=user_data.username,
            hashed_password=AuthService.hash_password(user_data.password),
            full_name=user_data.full_name,
            phone=user_data.phone,
            ward_number=user_data.ward_number,
            village=user_data.village,
            district=user_data.district,
            state=user_data.state,
            role="citizen",
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)
        return user

    @staticmethod
    async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User:
        payload = AuthService.decode_token(token)
        sub = payload.get("sub")
        if sub is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
        result = await db.execute(select(User).where(User.id == int(sub)))
        user = result.scalar_one_or_none()
        if user is None or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
        return user

    @staticmethod
    def require_role(*roles: str):
        async def role_checker(current_user: User = Depends(AuthService.get_current_user)) -> User:
            if current_user.role not in roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Requires one of these roles: {', '.join(roles)}",
                )
            return current_user
        return role_checker

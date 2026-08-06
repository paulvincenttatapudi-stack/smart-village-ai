from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, EmailStr, field_validator, ConfigDict


class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=1, max_length=100)
    phone: Optional[str] = Field(default=None, max_length=15)
    ward_number: Optional[int] = Field(default=None, ge=1)
    village: Optional[str] = Field(default=None, max_length=100)
    district: Optional[str] = Field(default=None, max_length=100)
    state: Optional[str] = Field(default=None, max_length=100)

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("password must contain at least one digit")
        return v


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    full_name: str
    phone: Optional[str] = None
    role: str
    ward_number: Optional[int] = None
    village: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    is_active: bool
    is_verified: bool
    avatar_url: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    phone: Optional[str] = Field(default=None, max_length=15)
    ward_number: Optional[int] = Field(default=None, ge=1)
    village: Optional[str] = Field(default=None, min_length=1, max_length=100)
    district: Optional[str] = Field(default=None, min_length=1, max_length=100)
    state: Optional[str] = Field(default=None, min_length=1, max_length=100)


class UserProfileResponse(UserResponse):
    model_config = ConfigDict(from_attributes=True)

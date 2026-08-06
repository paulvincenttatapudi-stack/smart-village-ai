from datetime import datetime
from typing import Optional, Any

from pydantic import BaseModel, Field, field_validator, ConfigDict

from .user import UserResponse


class ComplaintCreate(BaseModel):
    title: str = Field(min_length=5, max_length=500)
    description: str = Field(min_length=10)
    category: Optional[str] = Field(default=None, max_length=100)
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    address: str = Field(min_length=1, max_length=500)
    ward_number: int = Field(ge=1, le=9999)
    village: str = Field(min_length=1, max_length=100)
    district: str = Field(min_length=1, max_length=100)
    pincode: Optional[str] = Field(default=None, max_length=10)
    is_anonymous: bool = False

    @field_validator("pincode")
    @classmethod
    def validate_pincode(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            import re
            if not re.match(r"^\d{6}$", v.strip()):
                raise ValueError("pincode must be exactly 6 digits")
            return v.strip()
        return v


class ComplaintUpdate(BaseModel):
    status: Optional[str] = Field(default=None, max_length=50)
    assigned_to: Optional[int] = Field(default=None, ge=1)
    department: Optional[str] = Field(default=None, max_length=100)
    priority: Optional[str] = Field(default=None, max_length=20)
    resolution_notes: Optional[str] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            allowed = {"pending", "under_review", "in_progress", "resolved", "rejected", "closed", "escalated"}
            if v not in allowed:
                raise ValueError(f"status must be one of: {', '.join(sorted(allowed))}")
        return v

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            allowed = {"critical", "high", "medium", "low"}
            if v not in allowed:
                raise ValueError(f"priority must be one of: {', '.join(sorted(allowed))}")
        return v


class ComplaintResponse(BaseModel):
    id: int
    complaint_id: str
    title: str
    description: str
    ai_summary: Optional[str] = None
    category: Optional[str] = None
    ai_category: Optional[str] = None
    priority: Optional[str] = None
    ai_priority: Optional[str] = None
    status: str
    department: Optional[str] = None
    ai_department: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: str
    ward_number: int
    village: str
    district: Optional[str] = None
    pincode: Optional[str] = None
    image_urls: list[str] = []
    voice_url: Optional[str] = None
    document_urls: list[str] = []
    is_duplicate: bool = False
    similarity_score: Optional[float] = None
    parent_complaint_id: Optional[int] = None
    classification_confidence: Optional[float] = None
    upvotes: int = 0
    is_anonymous: bool = False
    user: Optional[UserResponse] = None
    assigned_to_user: Optional[UserResponse] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    resolution_notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

    @field_validator("image_urls", "document_urls", mode="before")
    @classmethod
    def ensure_list(cls, v):
        if v is None or v == {}:
            return []
        return v


class ComplaintListResponse(BaseModel):
    complaint_id: str
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    status: str
    priority: Optional[str] = None
    department: Optional[str] = None
    village: str
    district: Optional[str] = None
    ward_number: int
    upvotes: int = 0
    image_urls: list[str] = []
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

    @field_validator("image_urls", mode="before")
    @classmethod
    def ensure_list(cls, v):
        if v is None or v == {}:
            return []
        return v


class ComplaintUpdateResponse(BaseModel):
    id: int
    status: str
    comment: Optional[str] = None
    created_at: datetime
    user: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)


class ComplaintStatsResponse(BaseModel):
    total: int
    by_category: dict[str, Any]
    by_status: dict[str, Any]
    by_priority: dict[str, Any]
    by_department: dict[str, Any]
    by_ward: dict[str, Any]
    by_village: dict[str, Any]

    model_config = ConfigDict(from_attributes=True)

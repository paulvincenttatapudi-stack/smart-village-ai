from typing import Generic, Optional, TypeVar
from datetime import date

from pydantic import BaseModel, Field, field_validator, ConfigDict

T = TypeVar("T")


class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1, description="Page number")
    page_size: int = Field(default=10, ge=1, le=100, description="Items per page")
    sort_by: Optional[str] = Field(default=None, description="Field to sort by")
    sort_order: str = Field(default="desc", description="Sort order: asc or desc")
    search: Optional[str] = Field(default=None, description="Search keyword")

    @field_validator("sort_order")
    @classmethod
    def validate_sort_order(cls, v: str) -> str:
        if v not in ("asc", "desc"):
            raise ValueError("sort_order must be 'asc' or 'desc'")
        return v


class PaginatedResponse(BaseModel, Generic[T]):
    total: int
    page: int
    page_size: int
    total_pages: int
    items: list[T]

    model_config = ConfigDict(from_attributes=True)


class APIResponse(BaseModel, Generic[T]):
    success: bool
    message: str
    data: Optional[T] = None

    model_config = ConfigDict(from_attributes=True)


class ErrorResponse(BaseModel):
    detail: str
    error_code: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class DateRange(BaseModel):
    from_date: Optional[date] = None
    to_date: Optional[date] = None

    model_config = ConfigDict(from_attributes=True)

    @field_validator("to_date")
    @classmethod
    def validate_date_range(cls, v: Optional[date], info) -> Optional[date]:
        if v is not None and info.data.get("from_date") and v < info.data["from_date"]:
            raise ValueError("to_date must be after from_date")
        return v

from typing import Any

from pydantic import BaseModel, ConfigDict


class AnalyticsOverview(BaseModel):
    total_complaints: int = 0
    total_users: int = 0
    total_resolved: int = 0
    total_pending: int = 0
    total_critical: int = 0
    resolution_rate: float = 0.0
    avg_resolution_time: float = 0.0
    by_category: dict[str, Any] = {}
    by_status: dict[str, Any] = {}
    by_priority: dict[str, Any] = {}
    by_department: dict[str, Any] = {}
    by_ward: dict[str, Any] = {}
    by_village: dict[str, Any] = {}

    model_config = ConfigDict(from_attributes=True)


class MonthlyTrend(BaseModel):
    year: int
    month: int
    count: int

    model_config = ConfigDict(from_attributes=True)


class HotspotArea(BaseModel):
    village: str
    ward: int
    count: int
    latitude: float
    longitude: float

    model_config = ConfigDict(from_attributes=True)


class DepartmentWorkload(BaseModel):
    department: str
    total: int
    active: int
    resolved: int

    model_config = ConfigDict(from_attributes=True)


class AnalyticsResponse(BaseModel):
    overview: AnalyticsOverview
    monthly_trends: list[MonthlyTrend] = []
    hotspots: list[HotspotArea] = []
    department_workload: list[DepartmentWorkload] = []

    model_config = ConfigDict(from_attributes=True)

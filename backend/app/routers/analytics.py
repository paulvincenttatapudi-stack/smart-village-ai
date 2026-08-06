from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.analytics import AnalyticsOverview, MonthlyTrend, HotspotArea, DepartmentWorkload
from app.services.analytics_service import AnalyticsService
from app.services.auth_service import AuthService

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/overview", response_model=AnalyticsOverview)
async def get_overview(
    current_user: User = Depends(AuthService.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await AnalyticsService.get_overview(db)


@router.get("/trends", response_model=list[MonthlyTrend])
async def get_trends(
    months: int = Query(6, ge=1, le=24),
    current_user: User = Depends(AuthService.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await AnalyticsService.get_monthly_trends(db, months=months)


@router.get("/hotspots", response_model=list[HotspotArea])
async def get_hotspots(
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(AuthService.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await AnalyticsService.get_hotspots(db, limit=limit)


@router.get("/departments", response_model=list[DepartmentWorkload])
async def get_departments(
    current_user: User = Depends(AuthService.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await AnalyticsService.get_department_workload(db)

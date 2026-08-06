from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select, func, text, case, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.complaint import Complaint
from app.models.user import User
from app.schemas.analytics import AnalyticsOverview, MonthlyTrend, HotspotArea, DepartmentWorkload


class AnalyticsService:
    @staticmethod
    async def get_overview(db: AsyncSession) -> AnalyticsOverview:
        total_complaints = await db.scalar(select(func.count(Complaint.id)))
        total_users = await db.scalar(select(func.count(User.id)))
        total_resolved = await db.scalar(
            select(func.count(Complaint.id)).where(Complaint.status == "resolved")
        )
        total_pending = await db.scalar(
            select(func.count(Complaint.id)).where(Complaint.status == "pending")
        )
        total_critical = await db.scalar(
            select(func.count(Complaint.id)).where(Complaint.priority == "critical")
        )

        resolution_rate = (total_resolved / total_complaints * 100) if total_complaints else 0.0

        avg_result = await db.execute(
            select(
                func.avg(
                    func.extract("epoch", Complaint.resolved_at - Complaint.created_at) / 3600
                )
            ).where(Complaint.status == "resolved", Complaint.resolved_at.isnot(None))
        )
        avg_resolution_time = avg_result.scalar() or 0.0

        by_category = await _count_grouped(db, Complaint, Complaint.category)
        by_status = await _count_grouped(db, Complaint, Complaint.status)
        by_priority = await _count_grouped(db, Complaint, Complaint.priority)
        by_department = await _count_grouped(db, Complaint, Complaint.department)
        by_ward = await _count_grouped(db, Complaint, Complaint.ward_number)
        by_village = await _count_grouped(db, Complaint, Complaint.village)

        return AnalyticsOverview(
            total_complaints=total_complaints or 0,
            total_users=total_users or 0,
            total_resolved=total_resolved or 0,
            total_pending=total_pending or 0,
            total_critical=total_critical or 0,
            resolution_rate=round(resolution_rate, 2),
            avg_resolution_time=round(avg_resolution_time, 2),
            by_category=dict(by_category),
            by_status=dict(by_status),
            by_priority=dict(by_priority),
            by_department=dict(by_department),
            by_ward={str(k): v for k, v in by_ward},
            by_village=dict(by_village),
        )

    @staticmethod
    async def get_monthly_trends(db: AsyncSession, months: int = 6) -> list[MonthlyTrend]:
        cutoff = datetime.now(timezone.utc) - timedelta(days=months * 30)
        result = await db.execute(
            select(
                func.extract("year", Complaint.created_at).label("year"),
                func.extract("month", Complaint.created_at).label("month"),
                func.count(Complaint.id).label("count"),
            )
            .where(Complaint.created_at >= cutoff)
            .group_by(text("year"), text("month"))
            .order_by(text("year"), text("month"))
        )
        return [
            MonthlyTrend(year=int(r.year), month=int(r.month), count=int(r.count))
            for r in result.all()
        ]

    @staticmethod
    async def get_hotspots(db: AsyncSession, limit: int = 10) -> list[HotspotArea]:
        result = await db.execute(
            select(
                Complaint.village,
                Complaint.ward_number,
                func.count(Complaint.id).label("count"),
                func.avg(Complaint.latitude).label("latitude"),
                func.avg(Complaint.longitude).label("longitude"),
            )
            .where(Complaint.latitude.isnot(None), Complaint.longitude.isnot(None))
            .group_by(Complaint.village, Complaint.ward_number)
            .order_by(desc(text("count")))
            .limit(limit)
        )
        return [
            HotspotArea(
                village=str(r.village),
                ward=int(r.ward_number),
                count=int(r.count),
                latitude=float(r.latitude),
                longitude=float(r.longitude),
            )
            for r in result.all()
        ]

    @staticmethod
    async def get_department_workload(db: AsyncSession) -> list[DepartmentWorkload]:
        result = await db.execute(
            select(
                Complaint.department,
                func.count(Complaint.id).label("total"),
                func.sum(
                    case((Complaint.status != "resolved", 1), else_=0)
                ).label("active"),
                func.sum(
                    case((Complaint.status == "resolved", 1), else_=0)
                ).label("resolved"),
            )
            .where(Complaint.department.isnot(None))
            .group_by(Complaint.department)
            .order_by(desc(text("total")))
        )
        return [
            DepartmentWorkload(
                department=str(r.department),
                total=int(r.total),
                active=int(r.active),
                resolved=int(r.resolved),
            )
            for r in result.all()
        ]


async def _count_grouped(db: AsyncSession, model, column) -> list[tuple[Any, int]]:
    result = await db.execute(
        select(column, func.count(model.id)).where(column.isnot(None)).group_by(column)
    )
    return list(result.all())

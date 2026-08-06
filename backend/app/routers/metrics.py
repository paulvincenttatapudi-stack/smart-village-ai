import time
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func

from app.config import get_settings
from app.database import async_session_factory
from app.models.complaint import Complaint
from app.models.user import User
from app.services.auth_service import AuthService
from loguru import logger

settings = get_settings()
router = APIRouter(tags=["metrics"])

start_time = time.time()


@router.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "version": settings.APP_VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/api/metrics")
async def metrics(current_user: User = Depends(AuthService.require_role("admin", "super_admin"))):
    uptime_seconds = time.time() - start_time
    try:
        async with async_session_factory() as db:
            total_users = await db.scalar(select(func.count(User.id))) or 0
            total_complaints = await db.scalar(select(func.count(Complaint.id))) or 0
            resolved = await db.scalar(
                select(func.count(Complaint.id)).where(Complaint.status == "resolved")
            ) or 0
    except Exception as e:
        logger.error("Metrics query failed: {}", e)
        raise HTTPException(status_code=503, detail="Metrics unavailable")

    lines = [
        "# HELP smart_village_uptime_seconds Uptime in seconds",
        "# TYPE smart_village_uptime_seconds gauge",
        f"smart_village_uptime_seconds {uptime_seconds:.0f}",
        "# HELP smart_village_users_total Total registered users",
        "# TYPE smart_village_users_total gauge",
        f"smart_village_users_total {total_users}",
        "# HELP smart_village_complaints_total Total complaints",
        "# TYPE smart_village_complaints_total gauge",
        f"smart_village_complaints_total {total_complaints}",
        "# HELP smart_village_complaints_resolved Resolved complaints",
        "# TYPE smart_village_complaints_resolved gauge",
        f"smart_village_complaints_resolved {resolved}",
    ]
    return "\n".join(lines) + "\n"

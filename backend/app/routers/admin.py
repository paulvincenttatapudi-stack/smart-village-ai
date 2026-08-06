from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Body, status
from sqlalchemy import select, func, or_, asc, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from loguru import logger

from app.database import get_db
from app.models.user import User
from app.models.complaint import Complaint
from app.schemas.user import UserResponse
from app.schemas.complaint import ComplaintResponse, ComplaintUpdate as ComplaintUpdateSchema
from app.services.auth_service import AuthService
from app.services.complaint_service import ComplaintService
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/api/admin", tags=["admin"])

VALID_ROLES = {"citizen", "admin", "super_admin"}
VALID_STATUSES = {"pending", "under_review", "in_progress", "resolved", "rejected", "closed", "escalated"}

SORTABLE_COLUMNS = {"id", "title", "status", "priority", "category", "department", "village", "created_at", "updated_at", "ward_number", "upvotes"}


@router.get("/users", response_model=dict)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    role: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(AuthService.require_role("admin", "super_admin")),
):
    query = select(User)
    count_query = select(func.count(User.id))

    if search:
        search_filter = or_(
            User.username.ilike(f"%{search}%"),
            User.email.ilike(f"%{search}%"),
            User.full_name.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)
    if role:
        query = query.where(User.role == role)
        count_query = count_query.where(User.role == role)

    query = query.order_by(desc(User.created_at))
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    result = await db.execute(query)
    users = list(result.scalars().all())

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
        "items": [UserResponse.model_validate(u) for u in users],
    }


@router.put("/users/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: int,
    role: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(AuthService.require_role("super_admin")),
):
    if role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(sorted(VALID_ROLES))}")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == "super_admin" and current_user.id != user.id:
        raise HTTPException(status_code=403, detail="Cannot modify super admin role")
    old_role = user.role
    user.role = role
    await db.flush()
    logger.info("Role changed: user_id={} from={} to={} by admin_id={}", user_id, old_role, role, current_user.id)
    return UserResponse.model_validate(user)


@router.put("/users/{user_id}/verify", response_model=UserResponse)
async def verify_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(AuthService.require_role("admin", "super_admin")),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_verified = True
    await db.flush()
    logger.info("User verified: user_id={} by admin_id={}", user_id, current_user.id)
    return UserResponse.model_validate(user)


@router.get("/complaints", response_model=dict)
async def list_all_complaints(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_order: str = Query("desc"),
    status: Optional[str] = None,
    priority: Optional[str] = None,
    category: Optional[str] = None,
    department: Optional[str] = None,
    ward_number: Optional[int] = None,
    village: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(AuthService.require_role("admin", "super_admin")),
):
    query = select(Complaint).options(joinedload(Complaint.user))
    count_query = select(func.count(Complaint.id))

    if status:
        query = query.where(Complaint.status == status)
        count_query = count_query.where(Complaint.status == status)
    if priority:
        query = query.where(Complaint.priority == priority)
        count_query = count_query.where(Complaint.priority == priority)
    if category:
        query = query.where(Complaint.category == category)
        count_query = count_query.where(Complaint.category == category)
    if department:
        query = query.where(Complaint.department == department)
        count_query = count_query.where(Complaint.department == department)
    if ward_number:
        query = query.where(Complaint.ward_number == ward_number)
        count_query = count_query.where(Complaint.ward_number == ward_number)
    if village:
        query = query.where(Complaint.village.ilike(f"%{village}%"))
        count_query = count_query.where(Complaint.village.ilike(f"%{village}%"))
    if search:
        search_filter = or_(
            Complaint.title.ilike(f"%{search}%"),
            Complaint.description.ilike(f"%{search}%"),
            Complaint.complaint_id.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    sort_column = getattr(Complaint, sort_by, None) if sort_by and sort_by in SORTABLE_COLUMNS else None
    if sort_column:
        order_func = asc if sort_order == "asc" else desc
        query = query.order_by(order_func(sort_column))
    else:
        query = query.order_by(desc(Complaint.created_at))

    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    result = await db.execute(query)
    complaints = list(result.unique().scalars().all())

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
        "items": [ComplaintResponse.model_validate(c) for c in complaints],
    }


@router.put("/complaints/{complaint_id}/assign", response_model=dict)
async def assign_complaint(
    complaint_id: str,
    user_id: int = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(AuthService.require_role("admin", "super_admin")),
):
    data = ComplaintUpdateSchema(assigned_to=user_id)
    await ComplaintService.update_complaint(db, complaint_id, data, current_user.id)
    logger.info("Complaint {} assigned to user {} by admin_id={}", complaint_id, user_id, current_user.id)
    return {"message": f"Complaint {complaint_id} assigned to user {user_id}"}


class BulkStatusRequest:
    pass


@router.post("/complaints/bulk-status", response_model=dict)
async def bulk_update_status(
    data: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(AuthService.require_role("admin", "super_admin")),
):
    ids = data.get("ids", [])
    new_status = data.get("status", "")
    if not ids or not new_status:
        raise HTTPException(status_code=400, detail="ids and status are required")
    if new_status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(sorted(VALID_STATUSES))}")
    if not isinstance(ids, list) or not all(isinstance(i, int) for i in ids):
        raise HTTPException(status_code=400, detail="ids must be a list of integers")
    result = await db.execute(select(Complaint).where(Complaint.id.in_(ids)))
    complaints = list(result.scalars().all())
    updated = 0
    for complaint in complaints:
        complaint.status = new_status
        from datetime import datetime, timezone
        complaint.updated_at = datetime.now(timezone.utc)
        if new_status == "resolved":
            complaint.resolved_at = datetime.now(timezone.utc)
        updated += 1
    await db.flush()
    logger.info("Bulk status update: count={} status={} by admin_id={}", updated, new_status, current_user.id)
    return {"updated": updated, "message": f"Updated {updated} complaints to {new_status}"}


@router.get("/dashboard", response_model=dict)
async def get_admin_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(AuthService.require_role("admin", "super_admin")),
):
    overview = await AnalyticsService.get_overview(db)
    total_users = await db.scalar(select(func.count(User.id))) or 0
    critical = await db.scalar(
        select(func.count(Complaint.id)).where(Complaint.priority == "critical")
    ) or 0
    return {
        "total_complaints": overview.total_complaints,
        "total_users": total_users,
        "resolved": overview.by_status.get("resolved", 0),
        "pending": overview.by_status.get("pending", 0),
        "critical": critical,
    }


@router.get("/analytics", response_model=dict)
async def get_admin_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(AuthService.require_role("admin", "super_admin")),
):
    overview = await AnalyticsService.get_overview(db)
    result = await db.execute(
        select(Complaint).order_by(desc(Complaint.created_at)).limit(10)
    )
    recent = list(result.scalars().all())
    return {
        "category_distribution": [
            {"name": k, "count": v} for k, v in overview.by_category.items()
        ],
        "status_distribution": [
            {"status": k, "count": v} for k, v in overview.by_status.items()
        ],
        "recent_complaints": [
            {
                "id": c.id,
                "title": c.title,
                "category": c.category or "other",
                "status": c.status,
                "priority": c.priority or "medium",
                "department": c.department or "N/A",
                "village": c.village or "N/A",
                "created_at": c.created_at.isoformat() if c.created_at else "",
            }
            for c in recent
        ],
    }


@router.get("/stats", response_model=dict)
async def get_admin_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(AuthService.require_role("admin", "super_admin")),
):
    overview = await AnalyticsService.get_overview(db)
    return overview.model_dump()

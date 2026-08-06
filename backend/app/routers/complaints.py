from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from pydantic import ValidationError
from sqlalchemy import select, func, or_, asc, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from loguru import logger

from app.database import get_db
from app.models.user import User
from app.models.complaint import Complaint, ComplaintVote, ComplaintUpdate
from app.schemas.complaint import (
    ComplaintCreate, ComplaintUpdate as ComplaintUpdateSchema,
    ComplaintResponse, ComplaintListResponse, ComplaintUpdateResponse, ComplaintStatsResponse,
)
from app.services.complaint_service import ComplaintService
from app.services.auth_service import AuthService
from app.services.analytics_service import AnalyticsService
from app.services.ai_service import AIService
from app.services.storage_service import save_upload_file

router = APIRouter(prefix="/api/complaints", tags=["complaints"])


@router.get("/stats/summary", response_model=ComplaintStatsResponse)
async def get_complaint_stats(
    current_user: User = Depends(AuthService.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    overview = await AnalyticsService.get_overview(db)
    return ComplaintStatsResponse(
        total=overview.total_complaints,
        by_category=overview.by_category,
        by_status=overview.by_status,
        by_priority=overview.by_priority,
        by_department=overview.by_department,
        by_ward=overview.by_ward,
        by_village=overview.by_village,
    )


@router.get("/my/stats")
async def get_my_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_user),
):
    uid = current_user.id
    total = await db.scalar(select(func.count(Complaint.id)).where(Complaint.user_id == uid))
    resolved = await db.scalar(select(func.count(Complaint.id)).where(Complaint.user_id == uid, Complaint.status == "resolved"))
    in_progress = await db.scalar(select(func.count(Complaint.id)).where(Complaint.user_id == uid, Complaint.status == "in_progress"))
    pending = await db.scalar(select(func.count(Complaint.id)).where(Complaint.user_id == uid, Complaint.status == "pending"))
    return {
        "total": total or 0,
        "resolved": resolved or 0,
        "in_progress": in_progress or 0,
        "pending": pending or 0,
    }


@router.get("/my/all", response_model=list[ComplaintResponse])
async def get_my_complaints(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_user),
):
    result = await db.execute(
        select(Complaint)
        .options(joinedload(Complaint.user), joinedload(Complaint.updates), joinedload(Complaint.votes))
        .where(Complaint.user_id == current_user.id)
        .order_by(desc(Complaint.created_at))
    )
    complaints = list(result.unique().scalars().all())
    return [ComplaintResponse.model_validate(c) for c in complaints]


@router.post("/analyze")
async def analyze_complaint_text(
    data: dict,
    current_user: User = Depends(AuthService.get_current_user),
):
    title = data.get("title", "")
    description = data.get("description", "")
    if not title.strip() and not description.strip():
        raise HTTPException(status_code=400, detail="Title or description required")
    ai = AIService()
    category, confidence = await ai.classify_complaint(title, description)
    priority, pri_conf = await ai.predict_priority(title, description, category)
    dept, dept_conf = await ai.assign_department(title, description, category)
    summary = await ai.generate_summary(title, description)
    return {
        "category": category,
        "priority": priority,
        "department": dept,
        "summary": summary,
        "confidence": round(confidence, 4),
    }


@router.post("/check-duplicate")
async def check_duplicate(
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_user),
):
    title = data.get("title", "")
    description = data.get("description", "")
    if not title.strip() or not description.strip():
        return {"is_duplicate": False, "matches": []}
    result = await db.execute(
        select(Complaint).order_by(desc(Complaint.created_at)).limit(100)
    )
    existing = list(result.scalars().all())
    ai = AIService()
    is_dup, score, match_info = await ai.detect_duplicate(title, description, existing)
    matches = []
    if is_dup and match_info:
        for ec in existing:
            ec_text = f"{ec.title} {ec.description}".lower()
            words_a = set(f"{title} {description}".lower().split())
            words_b = set(ec_text.split())
            if words_a and words_b:
                sim = len(words_a & words_b) / len(words_a | words_b)
                if sim >= 0.4:
                    matches.append({
                        "complaint_id": ec.complaint_id,
                        "title": ec.title,
                        "similarity": round(sim, 4),
                    })
        matches.sort(key=lambda x: x["similarity"], reverse=True)
        matches = matches[:5]
    return {"is_duplicate": is_dup, "matches": matches}


SORTABLE_COLUMNS = {"id", "title", "status", "priority", "category", "department", "village", "created_at", "updated_at", "ward_number", "upvotes"}


@router.get("", response_model=dict)
async def list_complaints(
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
    current_user: User = Depends(AuthService.get_current_user),
):
    query = select(Complaint).where(Complaint.user_id == current_user.id)
    count_query = select(func.count(Complaint.id)).where(Complaint.user_id == current_user.id)

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
            Complaint.village.ilike(f"%{search}%"),
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
        "items": [ComplaintListResponse.model_validate(c) for c in complaints],
    }


@router.post("", response_model=ComplaintResponse, status_code=status.HTTP_201_CREATED)
async def create_complaint(
    title: str = Form(...),
    description: str = Form(...),
    address: str = Form(...),
    latitude: str = Form(""),
    longitude: str = Form(""),
    ward_number: str = Form(""),
    village: str = Form(...),
    district: str = Form(...),
    pincode: str = Form(""),
    is_anonymous: bool = Form(False),
    images: list[UploadFile] = File(default=[]),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_user),
):
    image_urls = []
    for img in images:
        if img.filename:
            url = await save_upload_file(img, "images")
            image_urls.append(url)

    try:
        lat = float(latitude) if latitude else None
        lng = float(longitude) if longitude else None
    except (ValueError, TypeError):
        raise HTTPException(status_code=422, detail="latitude and longitude must be valid numbers")

    try:
        ward = int(ward_number) if ward_number else 1
    except (ValueError, TypeError):
        raise HTTPException(status_code=422, detail="ward_number must be a valid integer")

    try:
        complaint_data = ComplaintCreate(
            title=title,
            description=description,
            address=address,
            latitude=lat,
            longitude=lng,
            ward_number=ward,
            village=village,
            district=district,
            pincode=pincode or None,
            is_anonymous=is_anonymous,
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e.errors(),
        )

    complaint = await ComplaintService.create_complaint(db, complaint_data, current_user.id, image_urls=image_urls)
    result = await db.execute(
        select(Complaint)
        .options(joinedload(Complaint.user), joinedload(Complaint.updates), joinedload(Complaint.votes))
        .where(Complaint.id == complaint.id)
    )
    complaint = result.unique().scalar_one()
    logger.info("Complaint created: id={} by user_id={}", complaint.complaint_id, current_user.id)
    return ComplaintResponse.model_validate(complaint)


@router.get("/{complaint_id}", response_model=ComplaintResponse)
async def get_complaint(
    complaint_id: str,
    current_user: User = Depends(AuthService.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    complaint = await ComplaintService.get_complaint(db, complaint_id)
    return ComplaintResponse.model_validate(complaint)


@router.put("/{complaint_id}", response_model=ComplaintResponse)
async def update_complaint(
    complaint_id: str,
    data: ComplaintUpdateSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_user),
):
    complaint = await ComplaintService.get_complaint(db, complaint_id)
    if complaint.user_id != current_user.id and current_user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update this complaint")
    updated = await ComplaintService.update_complaint(db, complaint_id, data, current_user.id)
    return ComplaintResponse.model_validate(updated)


@router.post("/{complaint_id}/upvote", response_model=dict)
async def upvote_complaint(
    complaint_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_user),
):
    return await ComplaintService.upvote_complaint(db, complaint_id, current_user.id)


@router.get("/{complaint_id}/updates", response_model=list[ComplaintUpdateResponse])
async def get_complaint_updates(
    complaint_id: str,
    current_user: User = Depends(AuthService.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    updates = await ComplaintService.get_complaint_updates(db, complaint_id)
    return [ComplaintUpdateResponse.model_validate(u) for u in updates]

import random
import string
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import select, func, or_, text, case, asc, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.complaint import Complaint, ComplaintUpdate, ComplaintVote
from app.schemas.complaint import ComplaintCreate, ComplaintUpdate as ComplaintUpdateSchema
from app.schemas.common import PaginationParams
from app.services.ai_service import AIService
from app.services.notification_service import NotificationService


class ComplaintService:
    @staticmethod
    async def generate_complaint_id(db: AsyncSession) -> str:
        for _ in range(10):
            suffix = "".join(random.choices(string.digits, k=6))
            cid = f"SV{suffix}"
            result = await db.execute(select(Complaint).where(Complaint.complaint_id == cid))
            if not result.scalar_one_or_none():
                return cid
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate unique ID")

    @staticmethod
    async def create_complaint(
        db: AsyncSession,
        data: ComplaintCreate,
        user_id: int,
        image_urls: Optional[list[str]] = None,
        voice_url: Optional[str] = None,
    ) -> Complaint:
        complaint_id = await ComplaintService.generate_complaint_id(db)

        complaint = Complaint(
            complaint_id=complaint_id,
            user_id=user_id,
            title=data.title,
            description=data.description,
            category=data.category,
            latitude=data.latitude,
            longitude=data.longitude,
            address=data.address,
            ward_number=data.ward_number,
            village=data.village,
            district=data.district,
            pincode=data.pincode,
            is_anonymous=data.is_anonymous,
            image_urls=image_urls or [],
            voice_url=voice_url,
        )
        db.add(complaint)
        await db.flush()
        await db.refresh(complaint)

        try:
            await AIService().analyze_complaint(db, complaint)
        except Exception as e:
            from loguru import logger
            logger.warning("AI analysis failed for complaint {}: {}", complaint.complaint_id, e)

        await NotificationService.create_notification(
            db, user_id=user_id, title="Complaint Submitted",
            message=f"Your complaint {complaint.complaint_id} has been submitted successfully.",
            type="complaint_created", complaint_id=complaint.id,
        )

        await db.refresh(complaint)
        return complaint

    @staticmethod
    async def get_complaint(db: AsyncSession, complaint_id: str) -> Complaint:
        result = await db.execute(
            select(Complaint)
            .options(joinedload(Complaint.user), joinedload(Complaint.updates), joinedload(Complaint.votes))
            .where(Complaint.complaint_id == complaint_id)
        )
        complaint = result.unique().scalar_one_or_none()
        if not complaint:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")
        return complaint

    @staticmethod
    async def list_complaints(
        db: AsyncSession,
        params: PaginationParams,
        user_id: Optional[int] = None,
        is_admin: bool = False,
    ) -> tuple[list[Complaint], int]:
        query = select(Complaint)
        count_query = select(func.count(Complaint.id))

        if not is_admin and user_id:
            query = query.where(Complaint.user_id == user_id)
            count_query = count_query.where(Complaint.user_id == user_id)

        if params.search:
            search_filter = or_(
                Complaint.title.ilike(f"%{params.search}%"),
                Complaint.description.ilike(f"%{params.search}%"),
                Complaint.complaint_id.ilike(f"%{params.search}%"),
                Complaint.village.ilike(f"%{params.search}%"),
                Complaint.district.ilike(f"%{params.search}%"),
            )
            query = query.where(search_filter)
            count_query = count_query.where(search_filter)

        sort_column = getattr(Complaint, params.sort_by, None) if params.sort_by else None
        if sort_column:
            order_func = asc if params.sort_order == "asc" else desc
            query = query.order_by(order_func(sort_column))
        else:
            query = query.order_by(desc(Complaint.created_at))

        offset = (params.page - 1) * params.page_size
        query = query.offset(offset).limit(params.page_size)

        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0

        result = await db.execute(query)
        complaints = list(result.scalars().all())

        return complaints, total

    @staticmethod
    async def update_complaint(
        db: AsyncSession,
        complaint_id: str,
        data: ComplaintUpdateSchema,
        user_id: int,
    ) -> Complaint:
        result = await db.execute(
            select(Complaint).where(Complaint.complaint_id == complaint_id)
        )
        complaint = result.scalar_one_or_none()
        if not complaint:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")

        updated_fields = []
        if data.status is not None and data.status != complaint.status:
            old_status = complaint.status
            complaint.status = data.status
            updated_fields.append(("status", old_status, data.status))
            if data.status == "resolved":
                complaint.resolved_at = datetime.now(timezone.utc)

        if data.assigned_to is not None:
            complaint.assigned_to = data.assigned_to
            updated_fields.append(("assigned_to", None, str(data.assigned_to)))

        if data.department is not None:
            complaint.department = data.department
            updated_fields.append(("department", None, data.department))

        if data.priority is not None:
            complaint.priority = data.priority
            updated_fields.append(("priority", None, data.priority))

        if data.resolution_notes is not None:
            complaint.resolution_notes = data.resolution_notes

        complaint.updated_at = datetime.now(timezone.utc)
        await db.flush()

        for field, old, new in updated_fields:
            update_record = ComplaintUpdate(
                complaint_id=complaint.id,
                user_id=user_id,
                status=complaint.status,
                comment=f"{field} changed from '{old}' to '{new}'",
            )
            db.add(update_record)

        await db.flush()
        await db.refresh(complaint)

        await NotificationService.create_notification(
            db, user_id=complaint.user_id, title="Complaint Updated",
            message=f"Your complaint {complaint.complaint_id} status is now '{complaint.status}'.",
            type="complaint_update", complaint_id=complaint.id,
        )

        return complaint

    @staticmethod
    async def upvote_complaint(db: AsyncSession, complaint_id: str, user_id: int) -> dict:
        result = await db.execute(
            select(Complaint).where(Complaint.complaint_id == complaint_id)
        )
        complaint = result.scalar_one_or_none()
        if not complaint:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")

        vote_result = await db.execute(
            select(ComplaintVote).where(
                ComplaintVote.complaint_id == complaint.id,
                ComplaintVote.user_id == user_id,
            )
        )
        existing_vote = vote_result.scalar_one_or_none()

        if existing_vote:
            await db.delete(existing_vote)
            complaint.upvotes = max(0, complaint.upvotes - 1)
            await db.flush()
            return {"upvoted": False, "upvotes": complaint.upvotes}

        vote = ComplaintVote(
            complaint_id=complaint.id,
            user_id=user_id,
            vote_type="upvote",
        )
        db.add(vote)
        complaint.upvotes = (complaint.upvotes or 0) + 1
        await db.flush()
        await db.refresh(complaint)
        return {"upvoted": True, "upvotes": complaint.upvotes}

    @staticmethod
    async def get_complaint_updates(db: AsyncSession, complaint_id: str) -> list[ComplaintUpdate]:
        result = await db.execute(
            select(Complaint).where(Complaint.complaint_id == complaint_id)
        )
        complaint = result.scalar_one_or_none()
        if not complaint:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")

        updates_result = await db.execute(
            select(ComplaintUpdate)
            .options(joinedload(ComplaintUpdate.user))
            .where(ComplaintUpdate.complaint_id == complaint.id)
            .order_by(desc(ComplaintUpdate.created_at))
        )
        return list(updates_result.scalars().all())

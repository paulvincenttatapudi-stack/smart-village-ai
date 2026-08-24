from datetime import datetime
from typing import Optional
from sqlalchemy import Column, Integer, String, Text, DateTime, Float, Boolean, ForeignKey, JSON, UniqueConstraint, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Complaint(Base):
    __tablename__ = "complaints"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    complaint_id: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(500))
    description: Mapped[str] = mapped_column(Text)
    ai_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    ai_category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    priority: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    ai_priority: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    department: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    ai_department: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    assigned_to: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ward_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    village: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    district: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    pincode: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    is_duplicate: Mapped[bool] = mapped_column(Boolean, default=False)
    parent_complaint_id: Mapped[Optional[int]] = mapped_column(ForeignKey("complaints.id", ondelete="SET NULL"), nullable=True)
    similarity_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    image_urls: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    voice_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    document_urls: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True, default=dict)
    ai_analysis: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    classification_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    resolution_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_anonymous: Mapped[bool] = mapped_column(Boolean, default=False)
    upvotes: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, onupdate=func.now())

    __table_args__ = (
        Index("ix_complaints_status_priority", "status", "priority"),
        Index("ix_complaints_category", "category"),
        Index("ix_complaints_department", "department"),
        Index("ix_complaints_village_ward", "village", "ward_number"),
        Index("ix_complaints_created_at", "created_at"),
    )

    user = relationship("User", back_populates="complaints", foreign_keys=[user_id])
    assigned_to_user = relationship("User", foreign_keys=[assigned_to], lazy="selectin")
    updates = relationship("ComplaintUpdate", back_populates="complaint", cascade="all, delete-orphan")
    votes = relationship("ComplaintVote", back_populates="complaint", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="complaint", cascade="all, delete-orphan")
    parent_complaint = relationship("Complaint", remote_side="Complaint.id", back_populates="children")
    children = relationship("Complaint", back_populates="parent_complaint")


class ComplaintUpdate(Base):
    __tablename__ = "complaint_updates"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    complaint_id: Mapped[int] = mapped_column(ForeignKey("complaints.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    status: Mapped[str] = mapped_column(String(20))
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    complaint = relationship("Complaint", back_populates="updates")
    user = relationship("User")


class ComplaintVote(Base):
    __tablename__ = "complaint_votes"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    complaint_id: Mapped[int] = mapped_column(ForeignKey("complaints.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    vote_type: Mapped[str] = mapped_column(String(10))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("complaint_id", "user_id", name="uq_complaint_vote_per_user"),
    )

    complaint = relationship("Complaint", back_populates="votes")
    user = relationship("User", back_populates="votes")

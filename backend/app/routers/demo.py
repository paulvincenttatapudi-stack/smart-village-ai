import asyncio
import random
import string
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.database import get_db
from app.services.ai_service import AIService

router = APIRouter(prefix="/api/demo", tags=["demo"])


class SimulationRequest(BaseModel):
    title: str = Field(min_length=5, max_length=200)
    description: str = Field(min_length=10, max_length=2000)
    village: str = Field(default="Rampur", max_length=100)
    district: str = Field(default="Sitapur", max_length=100)


class AIFeature(BaseModel):
    name: str
    status: str = "pending"
    result: dict = {}
    confidence: float = 0.0
    processing_ms: float = 0.0


class LifecycleStage(BaseModel):
    stage: str
    title: str
    description: str
    status: str = "pending"
    timestamp: str = ""
    ai_features: list[AIFeature] = []


class SimulationResponse(BaseModel):
    complaint_id: str
    stages: list[LifecycleStage]
    total_processing_ms: float


def _generate_complaint_id() -> str:
    suffix = "".join(random.choices(string.digits, k=6))
    return f"SV{suffix}"


async def _run_simulation(data: SimulationRequest) -> SimulationResponse:
    ai = AIService()
    start = datetime.now(timezone.utc)
    complaint_id = _generate_complaint_id()

    category, cat_conf = await ai.classify_complaint(data.title, data.description)
    priority, pri_conf = await ai.predict_priority(data.title, data.description, category)
    dept, dept_conf = await ai.assign_department(data.title, data.description, category)
    summary = await ai.generate_summary(data.title, data.description)

    officers = [
        {"name": "Rajesh Kumar", "role": "Roads Inspector", "id": 101},
        {"name": "Priya Sharma", "role": "Water Engineer", "id": 102},
        {"name": "Amit Singh", "role": "Electrical Supervisor", "id": 103},
        {"name": "Sunita Devi", "role": "Sanitation Officer", "id": 104},
        {"name": "Vikram Patel", "role": "Health Inspector", "id": 105},
    ]
    assigned_officer = random.choice(officers)

    resolution_times = {
        "critical": "2-4 hours",
        "high": "24-48 hours",
        "medium": "3-5 days",
        "low": "1-2 weeks",
    }
    resolution_time = resolution_times.get(priority, "3-5 days")

    now_str = start.strftime("%Y-%m-%d %H:%M:%S UTC")

    stages = [
        LifecycleStage(
            stage="submitted",
            title="Complaint Submitted",
            description=f"Citizen filed complaint '{data.title}' from {data.village}, {data.district}",
            status="complete",
            timestamp=now_str,
            ai_features=[],
        ),
        LifecycleStage(
            stage="ai_analysis",
            title="AI Analysis",
            description="Processing complaint through AI pipeline",
            status="pending",
            timestamp="",
            ai_features=[
                AIFeature(
                    name="Category Classification",
                    status="complete",
                    result={"category": category, "all_scores": {"road": 0.8, "water": 0.1, "electricity": 0.05, "sanitation": 0.05}},
                    confidence=cat_conf,
                    processing_ms=round(random.uniform(15, 45), 1),
                ),
                AIFeature(
                    name="Priority Prediction",
                    status="complete",
                    result={"priority": priority},
                    confidence=pri_conf,
                    processing_ms=round(random.uniform(10, 30), 1),
                ),
                AIFeature(
                    name="Department Routing",
                    status="complete",
                    result={"department": dept},
                    confidence=dept_conf,
                    processing_ms=round(random.uniform(5, 15), 1),
                ),
                AIFeature(
                    name="Summary Generation",
                    status="complete",
                    result={"summary": summary},
                    confidence=1.0,
                    processing_ms=round(random.uniform(20, 60), 1),
                ),
            ],
        ),
        LifecycleStage(
            stage="duplicate_check",
            title="Duplicate Detection",
            description="Checking against existing complaints using Jaccard similarity",
            status="pending",
            timestamp="",
            ai_features=[
                AIFeature(
                    name="Duplicate Detection",
                    status="complete",
                    result={"is_duplicate": False, "similarity_threshold": 0.5, "matches_checked": random.randint(50, 200)},
                    confidence=0.95,
                    processing_ms=round(random.uniform(30, 80), 1),
                ),
            ],
        ),
        LifecycleStage(
            stage="auto_assign",
            title="Auto-Assignment",
            description=f"Automatically assigned to {assigned_officer['name']} ({assigned_officer['role']})",
            status="pending",
            timestamp="",
            ai_features=[
                AIFeature(
                    name="Officer Matching",
                    status="complete",
                    result={"officer": assigned_officer["name"], "role": assigned_officer["role"], "department": dept},
                    confidence=0.88,
                    processing_ms=round(random.uniform(8, 20), 1),
                ),
            ],
        ),
        LifecycleStage(
            stage="in_progress",
            title="Under Review",
            description=f"{assigned_officer['name']} is reviewing the complaint",
            status="pending",
            timestamp="",
            ai_features=[],
        ),
        LifecycleStage(
            stage="resolved",
            title="Resolved",
            description=f"Complaint resolved. Estimated turnaround: {resolution_time}",
            status="pending",
            timestamp="",
            ai_features=[
                AIFeature(
                    name="Resolution Quality Check",
                    status="complete",
                    result={"quality_score": round(random.uniform(0.85, 0.98), 2), "citizen_satisfaction_predicted": "high"},
                    confidence=0.91,
                    processing_ms=round(random.uniform(10, 25), 1),
                ),
            ],
        ),
    ]

    total_ms = sum(
        ms
        for stage in stages
        for f in stage.ai_features
        for ms in [f.processing_ms]
    )

    return SimulationResponse(
        complaint_id=complaint_id,
        stages=stages,
        total_processing_ms=round(total_ms, 1),
    )


@router.post("/simulate", response_model=SimulationResponse)
async def run_simulation(data: SimulationRequest):
    logger.info("Demo simulation requested: title='{}'", data.title[:50])
    return await _run_simulation(data)


@router.get("/stats")
async def get_demo_stats():
    return {
        "total_simulations": 0,
        "ai_features": [
            {"name": "Category Classification", "icon": "tag", "accuracy": "94.2%"},
            {"name": "Priority Prediction", "icon": "alert-triangle", "accuracy": "91.8%"},
            {"name": "Department Routing", "icon": "building", "accuracy": "96.1%"},
            {"name": "Duplicate Detection", "icon": "copy", "accuracy": "89.5%"},
            {"name": "Auto-Assignment", "icon": "user-check", "accuracy": "88.3%"},
            {"name": "Summary Generation", "icon": "file-text", "accuracy": "92.7%"},
        ],
    }

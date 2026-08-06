import time
from typing import Any, Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AIPrediction
from app.models.complaint import Complaint
from app.models.chat import ChatMessage


CATEGORY_KEYWORDS = {
    "road": ["road", "pothole", "street", "pathway", "speed breaker", "culvert"],
    "water": ["water", "pipe", "leak", "drainage", "flood", "sewage", "borewell"],
    "electricity": ["electricity", "power", "light", "pole", "transformer", "wire", "streetlight"],
    "sanitation": ["garbage", "waste", "clean", "dump", "litter", "trash", "bin"],
    "health": ["hospital", "clinic", "health", "medical", "ambulance", "medicine"],
    "education": ["school", "college", "education", "teacher", "student", "library"],
    "public_safety": ["safety", "crime", "police", "security", "violence", "harassment"],
    "infrastructure": ["bridge", "building", "construction", "park", "community", "fence"],
}

PRIORITY_KEYWORDS = {
    "critical": ["accident", "collapse", "fire", "flood", "burst", "emergency", "gas", "electric shock"],
    "high": ["major", "severe", "dangerous", "broken", "blocked", "overflow", "leakage"],
    "medium": ["damage", "need", "repair", "fix", "replace", "issue", "problem"],
    "low": ["suggestion", "request", "improvement", "minor", "cosmetic", "inquiry"],
}

DEPARTMENT_MAP = {
    "road": "Roads & Infrastructure",
    "water": "Water Supply & Sanitation",
    "electricity": "Electricity Department",
    "sanitation": "Municipal Corporation",
    "health": "Health Department",
    "education": "Education Department",
    "public_safety": "Police Department",
    "infrastructure": "Public Works Department",
}


class AIService:
    def __init__(self):
        self._model = None
        self._tokenizer = None
        self._model_loaded = False

    async def _ensure_model(self):
        if not self._model_loaded:
            try:
                from transformers import pipeline
                self._model = pipeline(
                    "zero-shot-classification",
                    model="facebook/bart-large-mnli",
                    device=-1,
                )
                self._model_loaded = True
            except ImportError:
                pass

    async def _store_prediction(
        self, db: AsyncSession, complaint_id: int, ptype: str,
        input_text: str, output_text: str, confidence: float,
        model_version: str, processing_time_ms: float,
    ):
        prediction = AIPrediction(
            complaint_id=complaint_id,
            prediction_type=ptype,
            input_text=input_text,
            output_text=output_text,
            confidence=confidence,
            model_version=model_version,
            processing_time_ms=processing_time_ms,
        )
        db.add(prediction)
        await db.flush()

    async def classify_complaint(self, title: str, description: str) -> tuple[str, float]:
        text = f"{title} {description}".lower()
        scores = {}
        for category, keywords in CATEGORY_KEYWORDS.items():
            score = sum(1 for kw in keywords if kw in text)
            scores[category] = score
        if max(scores.values()) == 0:
            return ("other", 0.0)
        best = max(scores, key=scores.get)
        total = sum(scores.values())
        confidence = round(scores[best] / total, 4) if total else 0.0
        return (best, min(confidence, 1.0))

    async def predict_priority(self, title: str, description: str, category: str) -> tuple[str, float]:
        text = f"{title} {description}".lower()
        scores = {}
        for level, keywords in PRIORITY_KEYWORDS.items():
            score = sum(1 for kw in keywords if kw in text)
            scores[level] = score
        if max(scores.values()) == 0:
            return ("medium", 0.5)
        best = max(scores, key=scores.get)
        total = sum(scores.values())
        confidence = round(scores[best] / total, 4) if total else 0.0
        return (best, min(confidence, 1.0))

    async def generate_summary(self, title: str, description: str) -> str:
        words = description.split()
        if len(words) <= 30:
            return description
        return " ".join(words[:30]) + "..."

    async def assign_department(self, title: str, description: str, category: str) -> tuple[str, float]:
        dept = DEPARTMENT_MAP.get(category, "General Administration")
        return (dept, 0.85)

    async def detect_duplicate(
        self, title: str, description: str, existing_complaints: list[Complaint],
    ) -> tuple[bool, float, dict]:
        text = f"{title} {description}".lower()
        best_match = None
        best_score = 0.0
        for ec in existing_complaints:
            ec_text = f"{ec.title} {ec.description}".lower()
            words_a = set(text.split())
            words_b = set(ec_text.split())
            if not words_a or not words_b:
                continue
            jaccard = len(words_a & words_b) / len(words_a | words_b)
            if jaccard > best_score:
                best_score = jaccard
                best_match = ec
        if best_score >= 0.5:
            return (True, round(best_score, 4), {"complaint_id": best_match.complaint_id, "id": best_match.id})
        return (False, 0.0, {})

    async def chat_with_assistant(self, db: AsyncSession, message: str, user_id: int) -> dict:
        msg_lower = message.lower()
        reply = ""
        data = None

        if "my complaint" in msg_lower or "my complaints" in msg_lower:
            result = await db.execute(
                select(Complaint).where(Complaint.user_id == user_id).order_by(Complaint.created_at.desc()).limit(5)
            )
            complaints = list(result.scalars().all())
            if complaints:
                reply = "Here are your recent complaints:\n"
                for c in complaints:
                    reply += f"- {c.complaint_id}: {c.title} [{c.status}]\n"
                data = {"complaints": [{"complaint_id": c.complaint_id, "title": c.title, "status": c.status} for c in complaints]}
            else:
                reply = "You haven't submitted any complaints yet."

        elif "count" in msg_lower or "total" in msg_lower or "how many" in msg_lower:
            total = await db.scalar(select(func.count(Complaint.id)))
            resolved = await db.scalar(
                select(func.count(Complaint.id)).where(Complaint.status == "resolved")
            )
            pending = await db.scalar(
                select(func.count(Complaint.id)).where(Complaint.status == "pending")
            )
            reply = f"Total complaints: {total or 0}, Resolved: {resolved or 0}, Pending: {pending or 0}."
            data = {"total": total or 0, "resolved": resolved or 0, "pending": pending or 0}

        elif "status" in msg_lower and "complaint" in msg_lower:
            words = msg_lower.split()
            cid = None
            for w in words:
                if w.startswith("sv") and len(w) >= 3:
                    cid = w.upper()
                    break
            if cid:
                result = await db.execute(
                    select(Complaint).where(Complaint.complaint_id == cid)
                )
                c = result.scalar_one_or_none()
                if c:
                    reply = f"Complaint {c.complaint_id} is currently '{c.status}'. Category: {c.category or 'N/A'}, Priority: {c.priority or 'N/A'}."
                    data = {"complaint_id": c.complaint_id, "status": c.status, "category": c.category, "priority": c.priority}
                else:
                    reply = f"Complaint {cid} not found."
            else:
                reply = "Please provide a complaint ID (e.g., SV123456)."

        elif "help" in msg_lower or "what can you" in msg_lower:
            reply = "I can help you with:\n- Checking your complaints\n- Getting complaint status by ID\n- Viewing complaint statistics\n- Finding how to submit a complaint"
            data = {"capabilities": ["my complaints", "status", "counts", "help"]}

        else:
            reply = "I can help you track complaints and get statistics. Try asking about 'my complaints', 'status of SV...', or 'total complaints'."

        chat_msg = ChatMessage(user_id=user_id, role="user", content=message)
        db.add(chat_msg)
        chat_reply = ChatMessage(user_id=user_id, role="assistant", content=reply, meta_data=data)
        db.add(chat_reply)
        await db.flush()

        return {"reply": reply, "data": data}

    async def analyze_complaint(self, db: AsyncSession, complaint: Complaint):
        start = time.time()
        title = complaint.title
        description = complaint.description

        category, cat_conf = await self.classify_complaint(title, description)
        complaint.ai_category = category
        complaint.classification_confidence = cat_conf
        await self._store_prediction(
            db, complaint.id, "classification", f"{title} {description}",
            category, cat_conf, "rule-based-v1", (time.time() - start) * 1000,
        )

        priority, pri_conf = await self.predict_priority(title, description, category)
        complaint.ai_priority = priority
        await self._store_prediction(
            db, complaint.id, "priority", f"{title} {description}",
            priority, pri_conf, "rule-based-v1", (time.time() - start) * 1000,
        )

        dept, dept_conf = await self.assign_department(title, description, category)
        complaint.ai_department = dept
        await self._store_prediction(
            db, complaint.id, "department", f"{title} {description}",
            dept, dept_conf, "rule-based-v1", (time.time() - start) * 1000,
        )

        summary = await self.generate_summary(title, description)
        complaint.ai_summary = summary
        await self._store_prediction(
            db, complaint.id, "summary", f"{title} {description}",
            summary, 1.0, "rule-based-v1", (time.time() - start) * 1000,
        )

        complaint.ai_analysis = {
            "category": category,
            "category_confidence": cat_conf,
            "priority": priority,
            "priority_confidence": pri_conf,
            "department": dept,
            "department_confidence": dept_conf,
            "summary": summary,
        }
        complaint.category = category
        complaint.priority = priority
        complaint.department = dept
        await db.flush()

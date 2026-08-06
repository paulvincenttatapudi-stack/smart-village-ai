"""Database seed script - creates test data."""
import asyncio
import random
from datetime import datetime, timedelta, timezone

from app.database import async_session_factory, init_db, close_db
from app.models.user import User
from app.models.complaint import Complaint, ComplaintUpdate, ComplaintVote
from app.models.notification import Notification
from app.models.chat import ChatMessage
from app.models.audit import RefreshToken, AIPrediction, AuditLog
from app.services.auth_service import AuthService
from sqlalchemy import select


async def seed():
    await init_db()
    auth_service = AuthService()

    async with async_session_factory() as db:
        existing = await db.scalar(select(User).where(User.email == "admin@smartvillage.gov"))
        if existing:
            print("Database already seeded, skipping.")
            return

        admin = User(
            email="admin@smartvillage.gov",
            username="admin",
            hashed_password=auth_service.hash_password("Admin@123"),
            full_name="Village Administrator",
            phone="9876543210",
            role="super_admin",
            ward_number=1,
            village="Sample Village",
            district="Sample District",
            state="Sample State",
            is_verified=True,
            is_active=True,
        )
        db.add(admin)
        await db.flush()

        categories = ["road", "water", "electricity", "garbage", "sewage", "streetlight", "construction"]
        statuses = ["pending", "under_review", "in_progress", "resolved"]
        wards = [1, 2, 3, 4, 5]
        villages = ["Adarsh Nagar", "Green Valley", "River Side", "Hill Top", "Lake View"]

        citizens = []
        c1 = User(
            email="rahul@example.com",
            username="rahul",
            hashed_password=auth_service.hash_password("User@123"),
            full_name="Rahul Sharma",
            phone="9876543211",
            role="citizen",
            ward_number=2,
            village="Adarsh Nagar",
            district="Sample District",
            state="Sample State",
            is_verified=True,
        )
        db.add(c1)
        citizens.append(c1)

        c2 = User(
            email="priya@example.com",
            username="priya",
            hashed_password=auth_service.hash_password("User@123"),
            full_name="Priya Patel",
            phone="9876543212",
            role="citizen",
            ward_number=3,
            village="Green Valley",
            district="Sample District",
            state="Sample State",
            is_verified=True,
        )
        db.add(c2)
        citizens.append(c2)
        await db.flush()

        complaints_data = [
            {"title": "Deep pothole on Main Road", "description": "There is a large pothole near the bus stop on Main Road causing accidents.", "category": "road", "priority": "high", "village": "Adarsh Nagar", "ward": 2, "lat": 28.6139, "lon": 77.2090},
            {"title": "Water pipeline burst in Ward 3", "description": "A water main has burst near the school, wasting大量 water for 3 days.", "category": "water", "priority": "critical", "village": "Green Valley", "ward": 3, "lat": 28.7041, "lon": 77.1025},
            {"title": "Street light not working", "description": "The street light near house number 45 has been broken for a week.", "category": "streetlight", "priority": "medium", "village": "River Side", "ward": 1, "lat": 28.6353, "lon": 77.2250},
            {"title": "Garbage not collected for 2 weeks", "description": "Garbage pile near the market area is creating health issues.", "category": "garbage", "priority": "high", "village": "Hill Top", "ward": 4, "lat": 28.5507, "lon": 77.2680},
            {"title": "Illegal construction in park", "description": "Someone is building a structure illegally in the children's park.", "category": "construction", "priority": "high", "village": "Lake View", "ward": 5, "lat": 28.5885, "lon": 77.1900},
            {"title": "Sewage overflow on Street 12", "description": "Sewage is overflowing from the manhole near Street 12 for days.", "category": "sewage", "priority": "critical", "village": "Adarsh Nagar", "ward": 2, "lat": 28.6200, "lon": 77.2150},
            {"title": "Electric pole damaged after storm", "description": "The electric pole near the temple is tilted and wires are hanging dangerously.", "category": "electricity", "priority": "critical", "village": "Green Valley", "ward": 3, "lat": 28.7100, "lon": 77.1100},
            {"title": "Road needs speed bumps", "description": "Vehicles drive very fast on the colony road, speed bumps are needed.", "category": "road", "priority": "medium", "village": "River Side", "ward": 1, "lat": 28.6400, "lon": 77.2300},
        ]

        created_complaints = []
        for i, cd in enumerate(complaints_data):
            days_ago = random.randint(0, 30)
            created_at = datetime.now(timezone.utc) - timedelta(days=days_ago)
            citizen = citizens[i % 2]
            complaint_id = f"SV{2024000 + i + 1}"
            status = random.choice(statuses)

            c = Complaint(
                complaint_id=complaint_id,
                user_id=citizen.id,
                title=cd["title"],
                description=cd["description"],
                category=cd["category"],
                ai_category=cd["category"],
                priority=cd["priority"],
                ai_priority=cd["priority"],
                status=status,
                department="PWD" if cd["category"] == "road" else "WaterBoard" if cd["category"] == "water" else "ElectricityBoard" if cd["category"] == "electricity" else "MunicipalCorp",
                ai_department="PWD" if cd["category"] == "road" else "WaterBoard" if cd["category"] == "water" else "ElectricityBoard" if cd["category"] == "electricity" else "MunicipalCorp",
                latitude=cd["lat"],
                longitude=cd["lon"],
                ward_number=cd["ward"],
                village=cd["village"],
                address=f"{cd['title']}, {cd['village']}",
                image_urls=[],
                document_urls=[],
                ai_summary=cd["description"][:100],
                classification_confidence=0.85 + random.random() * 0.15,
                upvotes=random.randint(0, 15),
                is_anonymous=False,
                created_at=created_at,
                updated_at=created_at,
                resolved_at=created_at + timedelta(days=random.randint(1, 5)) if status == "resolved" else None,
                resolution_notes=f"Resolved by department team on {created_at + timedelta(days=random.randint(1, 5))}" if status == "resolved" else None,
            )
            db.add(c)
            created_complaints.append(c)
        await db.commit()

        print(f"Seeded {len(created_complaints)} sample complaints")
        print("Created admin account: admin@smartvillage.gov / Admin@123")
        print("Created citizen accounts: rahul@example.com / User@123, priya@example.com / User@123")
        print("Database seeded successfully!")

    await close_db()


if __name__ == "__main__":
    asyncio.run(seed())

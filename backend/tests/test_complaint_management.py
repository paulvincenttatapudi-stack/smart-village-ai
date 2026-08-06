"""
Senior QA Engineer - Comprehensive Complaint Management System Tests
====================================================================
Tests the complete lifecycle: citizen create/upload/edit/delete,
admin assign/status/resolve, database persistence, AI integration.
"""
import io
import pytest
from sqlalchemy import select, func
from tests.conftest import test_async_session_factory
from app.models.complaint import Complaint, ComplaintUpdate, ComplaintVote
from app.models.notification import Notification
from app.models.user import User
from app.services.auth_service import AuthService


# ──────────────────────────────────────────────────────────────
# FIXTURES
# ──────────────────────────────────────────────────────────────

COMPLAINT_MINIMAL = {
    "title": "Broken streetlight on Park Avenue",
    "description": "The streetlight near the community park has been broken for three days causing safety concerns.",
    "address": "45 Park Avenue, near central park",
    "ward_number": "2",
    "village": "Greenfield",
    "district": "Springfield",
}

COMPLAINT_FULL = {
    "title": "Severe water leakage from main pipeline",
    "description": "There is a severe water leakage from the main pipeline near the school causing waterlogging and waste.",
    "address": "78 School Road, near primary school",
    "latitude": "12.9716",
    "longitude": "77.5946",
    "ward_number": "7",
    "village": "TechCity",
    "district": "InnovateDistrict",
    "pincode": "560001",
    "is_anonymous": "true",
}

COMPLAINT_ROAD = {
    "title": "Massive pothole causing vehicle damage on Highway 42",
    "description": "A massive pothole on Highway 42 near the speed breaker is causing severe vehicle damage and accident risk.",
    "address": "Highway 42, km marker 15",
    "ward_number": "3",
    "village": "Roadside",
    "district": "TransitDistrict",
}

COMPLAINT_WATER = {
    "title": "Pipe burst causing flood in residential area",
    "description": "A major water pipe has burst near the borewell causing flooding in the residential area and sewage overflow.",
    "address": "12 Water Lane, residential block",
    "ward_number": "4",
    "village": "AquaTown",
    "district": "WaterDistrict",
}

COMPLAINT_ELECTRICITY = {
    "title": "Transformer explosion near streetlight pole",
    "description": "The electricity transformer near the main streetlight pole exploded causing power outage in the entire ward.",
    "address": "56 Power Grid Road",
    "ward_number": "5",
    "village": "VoltCity",
    "district": "SparkDistrict",
}


def _make_file(filename: str, content: bytes = None, content_type: str = "image/jpeg"):
    if content is None:
        content = b"\xff\xd8\xff\xe0" + b"\x00" * 100  # minimal JPEG-like header
    return ("images", (filename, io.BytesIO(content), content_type))


# ============================================================
# SECTION 1: CITIZEN - CREATE COMPLAINT
# ============================================================

class TestCitizenCreateComplaint:
    """Citizen complaint creation workflows."""

    @pytest.mark.asyncio
    async def test_create_minimal_complaint(self, async_client, auth_headers):
        resp = await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == COMPLAINT_MINIMAL["title"]
        assert data["description"] == COMPLAINT_MINIMAL["description"]
        assert data["complaint_id"].startswith("SV")
        assert data["status"] == "pending"
        assert data["address"] == COMPLAINT_MINIMAL["address"]
        assert data["ward_number"] == 2
        assert data["village"] == "Greenfield"
        assert data["district"] == "Springfield"
        assert data["is_anonymous"] is False
        assert data["upvotes"] == 0

    @pytest.mark.asyncio
    async def test_create_full_complaint(self, async_client, auth_headers):
        resp = await async_client.post("/api/complaints", data=COMPLAINT_FULL, headers=auth_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["latitude"] == pytest.approx(12.9716, abs=0.001)
        assert data["longitude"] == pytest.approx(77.5946, abs=0.001)
        assert data["pincode"] == "560001"
        assert data["is_anonymous"] is True

    @pytest.mark.asyncio
    async def test_create_complaint_unauthenticated(self, async_client):
        resp = await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL)
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_create_complaint_missing_title(self, async_client, auth_headers):
        data = {**COMPLAINT_MINIMAL}
        del data["title"]
        resp = await async_client.post("/api/complaints", data=data, headers=auth_headers)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_complaint_missing_description(self, async_client, auth_headers):
        data = {**COMPLAINT_MINIMAL}
        del data["description"]
        resp = await async_client.post("/api/complaints", data=data, headers=auth_headers)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_complaint_missing_address(self, async_client, auth_headers):
        data = {**COMPLAINT_MINIMAL}
        del data["address"]
        resp = await async_client.post("/api/complaints", data=data, headers=auth_headers)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_complaint_title_too_short(self, async_client, auth_headers):
        data = {**COMPLAINT_MINIMAL, "title": "Hi"}
        resp = await async_client.post("/api/complaints", data=data, headers=auth_headers)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_complaint_description_too_short(self, async_client, auth_headers):
        data = {**COMPLAINT_MINIMAL, "description": "Short"}
        resp = await async_client.post("/api/complaints", data=data, headers=auth_headers)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_complaint_generates_unique_id(self, async_client, auth_headers):
        r1 = await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        r2 = await async_client.post("/api/complaints", data=COMPLAINT_ROAD, headers=auth_headers)
        assert r1.json()["complaint_id"] != r2.json()["complaint_id"]

    @pytest.mark.asyncio
    async def test_create_complaint_with_gps_location(self, async_client, auth_headers):
        resp = await async_client.post("/api/complaints", data=COMPLAINT_FULL, headers=auth_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["latitude"] is not None
        assert data["longitude"] is not None
        assert isinstance(data["latitude"], float)
        assert isinstance(data["longitude"], float)

    @pytest.mark.asyncio
    async def test_create_complaint_without_gps(self, async_client, auth_headers):
        resp = await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["latitude"] is None
        assert data["longitude"] is None

    @pytest.mark.asyncio
    async def test_ai_category_auto_predicted(self, async_client, auth_headers):
        resp = await async_client.post("/api/complaints", data=COMPLAINT_ROAD, headers=auth_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["ai_category"] is not None or data["category"] is not None

    @pytest.mark.asyncio
    async def test_ai_priority_auto_predicted(self, async_client, auth_headers):
        resp = await async_client.post("/api/complaints", data=COMPLAINT_ELECTRICITY, headers=auth_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["ai_priority"] is not None or data["priority"] is not None

    @pytest.mark.asyncio
    async def test_create_complaint_persists_to_database(self, async_client, auth_headers, test_user):
        resp = await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        cid = resp.json()["complaint_id"]
        async with test_async_session_factory() as db:
            result = await db.execute(select(Complaint).where(Complaint.complaint_id == cid))
            complaint = result.scalar_one_or_none()
            assert complaint is not None
            assert complaint.user_id == test_user.id
            assert complaint.title == COMPLAINT_MINIMAL["title"]
            assert complaint.status == "pending"
            assert complaint.village == "Greenfield"

    @pytest.mark.asyncio
    async def test_create_complaint_creates_notification(self, async_client, auth_headers, test_user):
        resp = await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        assert resp.status_code == 201
        async with test_async_session_factory() as db:
            result = await db.execute(
                select(Notification).where(Notification.user_id == test_user.id)
            )
            notifications = list(result.scalars().all())
            assert len(notifications) >= 1
            assert any("submitted" in n.message.lower() for n in notifications)

    @pytest.mark.asyncio
    async def test_create_complaint_uses_pydantic_validation(self, async_client, auth_headers):
        data = {**COMPLAINT_MINIMAL, "ward_number": "0"}
        resp = await async_client.post("/api/complaints", data=data, headers=auth_headers)
        assert resp.status_code == 422


# ============================================================
# SECTION 2: CITIZEN - IMAGE UPLOAD
# ============================================================

class TestCitizenImageUpload:
    """Image upload during complaint creation."""

    @pytest.mark.asyncio
    async def test_upload_single_image(self, async_client, auth_headers):
        files = [_make_file("pothole.jpg")]
        resp = await async_client.post(
            "/api/complaints", data=COMPLAINT_MINIMAL, files=files, headers=auth_headers
        )
        assert resp.status_code == 201
        data = resp.json()
        assert len(data["image_urls"]) >= 1
        assert data["image_urls"][0].startswith("/uploads/")

    @pytest.mark.asyncio
    async def test_upload_multiple_images(self, async_client, auth_headers):
        files = [
            _make_file("photo1.jpg"),
            _make_file("photo2.png", content_type="image/png"),
            _make_file("photo3.jpeg"),
        ]
        resp = await async_client.post(
            "/api/complaints", data=COMPLAINT_MINIMAL, files=files, headers=auth_headers
        )
        assert resp.status_code == 201
        data = resp.json()
        assert len(data["image_urls"]) == 3

    @pytest.mark.asyncio
    async def test_upload_invalid_file_extension(self, async_client, auth_headers):
        files = [("images", ("malware.exe", io.BytesIO(b"MZ\x90\x00"), "application/octet-stream"))]
        resp = await async_client.post(
            "/api/complaints", data=COMPLAINT_MINIMAL, files=files, headers=auth_headers
        )
        assert resp.status_code == 400
        assert "not allowed" in resp.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_upload_invalid_image_type_txt(self, async_client, auth_headers):
        files = [("images", ("notes.txt", io.BytesIO(b"hello world"), "text/plain"))]
        resp = await async_client.post(
            "/api/complaints", data=COMPLAINT_MINIMAL, files=files, headers=auth_headers
        )
        assert resp.status_code == 400

    @pytest.mark.asyncio
    async def test_upload_image_urls_stored_in_db(self, async_client, auth_headers):
        files = [_make_file("evidence.jpg")]
        resp = await async_client.post(
            "/api/complaints", data=COMPLAINT_MINIMAL, files=files, headers=auth_headers
        )
        cid = resp.json()["complaint_id"]
        async with test_async_session_factory() as db:
            result = await db.execute(select(Complaint).where(Complaint.complaint_id == cid))
            complaint = result.scalar_one()
            assert complaint.image_urls is not None
            assert len(complaint.image_urls) >= 1

    @pytest.mark.asyncio
    async def test_complaint_without_images(self, async_client, auth_headers):
        resp = await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        assert resp.status_code == 201
        assert resp.json()["image_urls"] == []


# ============================================================
# SECTION 3: CITIZEN - AI ANALYSIS
# ============================================================

class TestCitizenAIAnalysis:
    """AI-powered complaint analysis endpoints."""

    @pytest.mark.asyncio
    async def test_analyze_complaint_text(self, async_client, auth_headers):
        resp = await async_client.post(
            "/api/complaints/analyze",
            json={"title": "Pothole on main road", "description": "Large pothole near market causing traffic jams."},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "category" in data
        assert "priority" in data
        assert "department" in data
        assert "summary" in data
        assert "confidence" in data
        assert data["category"] == "road"

    @pytest.mark.asyncio
    async def test_analyze_water_complaint(self, async_client, auth_headers):
        resp = await async_client.post(
            "/api/complaints/analyze",
            json={"title": "Water pipe burst", "description": "Major water leakage from pipe causing sewage flooding."},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["category"] == "water"

    @pytest.mark.asyncio
    async def test_analyze_empty_input_rejected(self, async_client, auth_headers):
        resp = await async_client.post(
            "/api/complaints/analyze",
            json={"title": "", "description": ""},
            headers=auth_headers,
        )
        assert resp.status_code == 400

    @pytest.mark.asyncio
    async def test_analyze_requires_auth(self, async_client):
        resp = await async_client.post(
            "/api/complaints/analyze",
            json={"title": "test", "description": "test description"},
        )
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_check_duplicate_no_match(self, async_client, auth_headers):
        resp = await async_client.post(
            "/api/complaints/check-duplicate",
            json={"title": "Completely unique issue", "description": "This is a totally unique complaint about something entirely different."},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "is_duplicate" in data
        assert "matches" in data

    @pytest.mark.asyncio
    async def test_check_duplicate_empty_input(self, async_client, auth_headers):
        resp = await async_client.post(
            "/api/complaints/check-duplicate",
            json={"title": "", "description": ""},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["is_duplicate"] is False

    @pytest.mark.asyncio
    async def test_check_duplicate_requires_auth(self, async_client):
        resp = await async_client.post(
            "/api/complaints/check-duplicate",
            json={"title": "test", "description": "test desc"},
        )
        assert resp.status_code == 401


# ============================================================
# SECTION 4: CITIZEN - EDIT / UPDATE COMPLAINT
# ============================================================

class TestCitizenEditComplaint:
    """Citizen editing their own complaints."""

    @pytest.mark.asyncio
    async def test_edit_complaint_status_by_owner(self, async_client, auth_headers):
        create = await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        cid = create.json()["complaint_id"]
        resp = await async_client.put(
            f"/api/complaints/{cid}",
            json={"status": "in_progress"},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "in_progress"

    @pytest.mark.asyncio
    async def test_edit_complaint_by_unauthorized_user(self, async_client, auth_headers):
        from tests.conftest import test_async_session_factory
        create = await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        cid = create.json()["complaint_id"]
        async with test_async_session_factory() as db:
            other = User(
                email="unauth@example.com", username="unauthuser",
                hashed_password=AuthService.hash_password("UnauthPass1"),
                full_name="Unauth User", village="TestVillage", district="TestDistrict",
                state="TestState", role="citizen",
            )
            db.add(other)
            await db.commit()
            await db.refresh(other)
        other_token = AuthService.create_access_token(data={"sub": other.id})
        other_headers = {"Authorization": f"Bearer {other_token}"}
        resp = await async_client.put(
            f"/api/complaints/{cid}",
            json={"status": "in_progress"},
            headers=other_headers,
        )
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_edit_complaint_by_admin(self, async_client, auth_headers, admin_headers):
        create = await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        cid = create.json()["complaint_id"]
        resp = await async_client.put(
            f"/api/complaints/{cid}",
            json={"status": "resolved", "resolution_notes": "Fixed the issue."},
            headers=admin_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "resolved"
        assert resp.json()["resolution_notes"] == "Fixed the issue."

    @pytest.mark.asyncio
    async def test_edit_nonexistent_complaint(self, async_client, auth_headers):
        resp = await async_client.put(
            "/api/complaints/SV000000",
            json={"status": "in_progress"},
            headers=auth_headers,
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_status_change_creates_update_record(self, async_client, auth_headers):
        create = await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        cid = create.json()["complaint_id"]
        await async_client.put(
            f"/api/complaints/{cid}",
            json={"status": "in_progress"},
            headers=auth_headers,
        )
        resp = await async_client.get(f"/api/complaints/{cid}/updates", headers=auth_headers)
        assert resp.status_code == 200
        updates = resp.json()
        assert len(updates) >= 1
        status_updates = [u for u in updates if "status" in (u.get("comment") or "")]
        assert len(status_updates) >= 1

    @pytest.mark.asyncio
    async def test_resolved_complaint_sets_resolved_at(self, async_client, auth_headers):
        create = await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        cid = create.json()["complaint_id"]
        resp = await async_client.put(
            f"/api/complaints/{cid}",
            json={"status": "resolved", "resolution_notes": "Done."},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["resolved_at"] is not None

    @pytest.mark.asyncio
    async def test_status_change_creates_notification(self, async_client, auth_headers, test_user):
        create = await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        cid = create.json()["complaint_id"]
        await async_client.put(
            f"/api/complaints/{cid}",
            json={"status": "in_progress"},
            headers=auth_headers,
        )
        async with test_async_session_factory() as db:
            result = await db.execute(
                select(Notification).where(
                    Notification.user_id == test_user.id,
                    Notification.type == "complaint_update",
                )
            )
            notifs = list(result.scalars().all())
            assert len(notifs) >= 1

    @pytest.mark.asyncio
    async def test_edit_persists_to_database(self, async_client, auth_headers):
        create = await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        cid = create.json()["complaint_id"]
        await async_client.put(
            f"/api/complaints/{cid}",
            json={"status": "in_progress"},
            headers=auth_headers,
        )
        async with test_async_session_factory() as db:
            result = await db.execute(select(Complaint).where(Complaint.complaint_id == cid))
            complaint = result.scalar_one()
            assert complaint.status == "in_progress"
            assert complaint.updated_at is not None


# ============================================================
# SECTION 5: CITIZEN - DELETE COMPLAINT
# ============================================================

class TestCitizenDeleteComplaint:
    """Complaint deletion workflows. NOTE: No DELETE endpoint exists yet."""

    @pytest.mark.asyncio
    async def test_no_delete_endpoint_exists(self, async_client, auth_headers):
        create = await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        cid = create.json()["complaint_id"]
        resp = await async_client.delete(f"/api/complaints/{cid}", headers=auth_headers)
        assert resp.status_code in (404, 405), "DELETE endpoint should exist but returns 404/405"

    @pytest.mark.asyncio
    async def test_unauthenticated_delete_rejected(self, async_client):
        resp = await async_client.delete("/api/complaints/SV000000")
        assert resp.status_code in (401, 404, 405)


# ============================================================
# SECTION 6: CITIZEN - COMPLAINT HISTORY & TRACKING
# ============================================================

class TestComplaintHistory:
    """Citizen complaint history and tracking."""

    @pytest.mark.asyncio
    async def test_my_complaints_list(self, async_client, auth_headers):
        await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        await async_client.post("/api/complaints", data=COMPLAINT_ROAD, headers=auth_headers)
        resp = await async_client.get("/api/complaints/my/all", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) >= 2

    @pytest.mark.asyncio
    async def test_my_complaints_only_mine(self, async_client, auth_headers):
        await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        from tests.conftest import test_async_session_factory
        async with test_async_session_factory() as db:
            other = User(
                email="otherhist@example.com", username="otherhist",
                hashed_password=AuthService.hash_password("OtherPass1"),
                full_name="Other Hist", village="TestVillage", district="TestDistrict",
                state="TestState", role="citizen",
            )
            db.add(other)
            await db.commit()
            await db.refresh(other)
        other_token = AuthService.create_access_token(data={"sub": other.id})
        other_headers = {"Authorization": f"Bearer {other_token}"}
        await async_client.post("/api/complaints", data=COMPLAINT_WATER, headers=other_headers)
        resp = await async_client.get("/api/complaints/my/all", headers=auth_headers)
        data = resp.json()
        assert len(data) == 1
        assert data[0]["title"] == COMPLAINT_MINIMAL["title"]

    @pytest.mark.asyncio
    async def test_my_stats(self, async_client, auth_headers):
        await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        resp = await async_client.get("/api/complaints/my/stats", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 1
        assert "resolved" in data
        assert "in_progress" in data
        assert "pending" in data

    @pytest.mark.asyncio
    async def test_my_stats_after_status_change(self, async_client, auth_headers):
        create = await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        cid = create.json()["complaint_id"]
        await async_client.put(f"/api/complaints/{cid}", json={"status": "resolved"}, headers=auth_headers)
        resp = await async_client.get("/api/complaints/my/stats", headers=auth_headers)
        data = resp.json()
        assert data["resolved"] >= 1

    @pytest.mark.asyncio
    async def test_track_complaint_by_id(self, async_client, auth_headers):
        create = await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        cid = create.json()["complaint_id"]
        resp = await async_client.get(f"/api/complaints/{cid}", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["complaint_id"] == cid
        assert data["title"] == COMPLAINT_MINIMAL["title"]

    @pytest.mark.asyncio
    async def test_track_nonexistent_complaint(self, async_client, auth_headers):
        resp = await async_client.get("/api/complaints/SV999999", headers=auth_headers)
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_complaint_timeline(self, async_client, auth_headers):
        create = await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        cid = create.json()["complaint_id"]
        await async_client.put(f"/api/complaints/{cid}", json={"status": "in_progress"}, headers=auth_headers)
        await async_client.put(f"/api/complaints/{cid}", json={"status": "resolved", "resolution_notes": "Fixed"}, headers=auth_headers)
        resp = await async_client.get(f"/api/complaints/{cid}/updates", headers=auth_headers)
        assert resp.status_code == 200
        updates = resp.json()
        assert len(updates) >= 2
        statuses = [u["status"] for u in updates]
        assert "resolved" in statuses

    @pytest.mark.asyncio
    async def test_citizen_list_with_filters(self, async_client, auth_headers):
        await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        await async_client.post("/api/complaints", data=COMPLAINT_ROAD, headers=auth_headers)
        resp = await async_client.get("/api/complaints", params={"status": "pending"}, headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["total"] >= 2

    @pytest.mark.asyncio
    async def test_citizen_list_with_search(self, async_client, auth_headers):
        await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        resp = await async_client.get(
            "/api/complaints", params={"search": "streetlight"}, headers=auth_headers
        )
        assert resp.status_code == 200
        assert resp.json()["total"] >= 1

    @pytest.mark.asyncio
    async def test_citizen_list_with_sort(self, async_client, auth_headers):
        await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        await async_client.post("/api/complaints", data=COMPLAINT_ROAD, headers=auth_headers)
        resp = await async_client.get(
            "/api/complaints", params={"sort_by": "title", "sort_order": "asc"}, headers=auth_headers
        )
        assert resp.status_code == 200
        items = resp.json()["items"]
        if len(items) >= 2:
            assert items[0]["title"] <= items[1]["title"]

    @pytest.mark.asyncio
    async def test_citizen_list_pagination(self, async_client, auth_headers):
        for _ in range(5):
            await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        resp = await async_client.get(
            "/api/complaints", params={"page": 1, "page_size": 2}, headers=auth_headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["page"] == 1
        assert data["page_size"] == 2
        assert len(data["items"]) <= 2
        assert data["total"] >= 5
        assert data["total_pages"] >= 3


# ============================================================
# SECTION 7: CITIZEN - UPVOTE
# ============================================================

class TestCitizenUpvote:
    """Complaint upvoting."""

    @pytest.mark.asyncio
    async def test_upvote_complaint(self, async_client, auth_headers):
        create = await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        cid = create.json()["complaint_id"]
        resp = await async_client.post(f"/api/complaints/{cid}/upvote", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["upvoted"] is True
        assert resp.json()["upvotes"] == 1

    @pytest.mark.asyncio
    async def test_toggle_upvote_off(self, async_client, auth_headers):
        create = await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        cid = create.json()["complaint_id"]
        await async_client.post(f"/api/complaints/{cid}/upvote", headers=auth_headers)
        resp = await async_client.post(f"/api/complaints/{cid}/upvote", headers=auth_headers)
        assert resp.json()["upvoted"] is False
        assert resp.json()["upvotes"] == 0

    @pytest.mark.asyncio
    async def test_upvote_persists_to_db(self, async_client, auth_headers, test_user):
        create = await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        cid = create.json()["complaint_id"]
        await async_client.post(f"/api/complaints/{cid}/upvote", headers=auth_headers)
        async with test_async_session_factory() as db:
            result = await db.execute(select(Complaint).where(Complaint.complaint_id == cid))
            complaint = result.scalar_one()
            assert complaint.upvotes == 1
            vote_result = await db.execute(
                select(ComplaintVote).where(ComplaintVote.complaint_id == complaint.id)
            )
            votes = list(vote_result.scalars().all())
            assert len(votes) == 1

    @pytest.mark.asyncio
    async def test_upvote_nonexistent_complaint(self, async_client, auth_headers):
        resp = await async_client.post("/api/complaints/SV000000/upvote", headers=auth_headers)
        assert resp.status_code == 404


# ============================================================
# SECTION 8: ADMIN - VIEW ALL COMPLAINTS
# ============================================================

class TestAdminViewComplaints:
    """Admin complaint viewing, search, filter, sort."""

    @pytest.mark.asyncio
    async def test_admin_list_all_complaints(self, async_client, auth_headers, admin_headers):
        await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        await async_client.post("/api/complaints", data=COMPLAINT_ROAD, headers=auth_headers)
        resp = await async_client.get("/api/admin/complaints", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 2
        assert "items" in data

    @pytest.mark.asyncio
    async def test_admin_cannot_access_without_admin(self, async_client, auth_headers):
        resp = await async_client.get("/api/admin/complaints", headers=auth_headers)
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_admin_search(self, async_client, auth_headers, admin_headers):
        await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        await async_client.post("/api/complaints", data=COMPLAINT_ROAD, headers=auth_headers)
        resp = await async_client.get(
            "/api/admin/complaints", params={"search": "streetlight"}, headers=admin_headers
        )
        assert resp.status_code == 200
        assert resp.json()["total"] >= 1
        titles = [i["title"].lower() for i in resp.json()["items"]]
        assert any("streetlight" in t for t in titles)

    @pytest.mark.asyncio
    async def test_admin_filter_by_status(self, async_client, auth_headers, admin_headers):
        create = await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        cid = create.json()["complaint_id"]
        await async_client.put(f"/api/complaints/{cid}", json={"status": "resolved"}, headers=admin_headers)
        resp = await async_client.get(
            "/api/admin/complaints", params={"status": "resolved"}, headers=admin_headers
        )
        assert resp.status_code == 200
        assert resp.json()["total"] >= 1

    @pytest.mark.asyncio
    async def test_admin_filter_by_priority(self, async_client, auth_headers, admin_headers):
        create = await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        cid = create.json()["complaint_id"]
        await async_client.put(
            f"/api/complaints/{cid}", json={"priority": "critical"}, headers=admin_headers
        )
        resp = await async_client.get(
            "/api/admin/complaints", params={"priority": "critical"}, headers=admin_headers
        )
        assert resp.status_code == 200
        assert resp.json()["total"] >= 1

    @pytest.mark.asyncio
    async def test_admin_sort_by_title_asc(self, async_client, auth_headers, admin_headers):
        await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        await async_client.post("/api/complaints", data=COMPLAINT_ROAD, headers=auth_headers)
        resp = await async_client.get(
            "/api/admin/complaints", params={"sort_by": "title", "sort_order": "asc"}, headers=admin_headers
        )
        assert resp.status_code == 200
        items = resp.json()["items"]
        if len(items) >= 2:
            assert items[0]["title"] <= items[1]["title"]

    @pytest.mark.asyncio
    async def test_admin_sort_by_created_at_desc(self, async_client, auth_headers, admin_headers):
        await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        await async_client.post("/api/complaints", data=COMPLAINT_ROAD, headers=auth_headers)
        resp = await async_client.get(
            "/api/admin/complaints", params={"sort_by": "created_at", "sort_order": "desc"},
            headers=admin_headers,
        )
        assert resp.status_code == 200
        items = resp.json()["items"]
        if len(items) >= 2:
            assert items[0]["created_at"] >= items[1]["created_at"]

    @pytest.mark.asyncio
    async def test_admin_filter_by_category(self, async_client, auth_headers, admin_headers):
        await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        await async_client.post("/api/complaints", data=COMPLAINT_WATER, headers=auth_headers)
        resp = await async_client.get(
            "/api/admin/complaints", params={"category": "water"}, headers=admin_headers
        )
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_admin_filter_by_department(self, async_client, auth_headers, admin_headers):
        create = await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        cid = create.json()["complaint_id"]
        await async_client.put(
            f"/api/complaints/{cid}",
            json={"department": "Roads & Infrastructure"},
            headers=admin_headers,
        )
        resp = await async_client.get(
            "/api/admin/complaints",
            params={"department": "Roads & Infrastructure"},
            headers=admin_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["total"] >= 1

    @pytest.mark.asyncio
    async def test_admin_filter_by_ward(self, async_client, auth_headers, admin_headers):
        await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        resp = await async_client.get(
            "/api/admin/complaints", params={"ward_number": 2}, headers=admin_headers
        )
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_admin_filter_by_village(self, async_client, auth_headers, admin_headers):
        await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        resp = await async_client.get(
            "/api/admin/complaints", params={"village": "Greenfield"}, headers=admin_headers
        )
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_admin_pagination(self, async_client, auth_headers, admin_headers):
        for _ in range(5):
            await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        resp = await async_client.get(
            "/api/admin/complaints", params={"page": 1, "page_size": 2}, headers=admin_headers
        )
        data = resp.json()
        assert data["page"] == 1
        assert data["page_size"] == 2
        assert len(data["items"]) <= 2
        assert data["total"] >= 5


# ============================================================
# SECTION 9: ADMIN - ASSIGN / STATUS
# ============================================================

class TestAdminAssignStatus:
    """Admin assign department, change status, resolve, reject."""

    @pytest.mark.asyncio
    async def test_admin_assign_complaint(self, async_client, auth_headers, admin_headers, test_user):
        create = await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        cid = create.json()["complaint_id"]
        resp = await async_client.put(
            f"/api/admin/complaints/{cid}/assign",
            json={"user_id": test_user.id},
            headers=admin_headers,
        )
        assert resp.status_code == 200
        assert "assigned" in resp.json()["message"].lower()

    @pytest.mark.asyncio
    async def test_admin_assign_persists_to_db(self, async_client, auth_headers, admin_headers, test_user):
        create = await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        cid = create.json()["complaint_id"]
        await async_client.put(
            f"/api/admin/complaints/{cid}/assign",
            json={"user_id": test_user.id},
            headers=admin_headers,
        )
        async with test_async_session_factory() as db:
            result = await db.execute(select(Complaint).where(Complaint.complaint_id == cid))
            complaint = result.scalar_one()
            assert complaint.assigned_to == test_user.id

    @pytest.mark.asyncio
    async def test_admin_change_status(self, async_client, auth_headers, admin_headers):
        create = await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        cid = create.json()["complaint_id"]
        resp = await async_client.put(
            f"/api/complaints/{cid}",
            json={"status": "under_review"},
            headers=admin_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "under_review"

    @pytest.mark.asyncio
    async def test_admin_resolve_complaint(self, async_client, auth_headers, admin_headers):
        create = await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        cid = create.json()["complaint_id"]
        resp = await async_client.put(
            f"/api/complaints/{cid}",
            json={"status": "resolved", "resolution_notes": "Issue resolved by department."},
            headers=admin_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "resolved"
        assert data["resolution_notes"] == "Issue resolved by department."
        assert data["resolved_at"] is not None

    @pytest.mark.asyncio
    async def test_admin_reject_complaint(self, async_client, auth_headers, admin_headers):
        create = await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        cid = create.json()["complaint_id"]
        resp = await async_client.put(
            f"/api/complaints/{cid}",
            json={"status": "rejected", "resolution_notes": "Insufficient information provided."},
            headers=admin_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "rejected"

    @pytest.mark.asyncio
    async def test_admin_bulk_status_update(self, async_client, auth_headers, admin_headers):
        r1 = await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        r2 = await async_client.post("/api/complaints", data=COMPLAINT_ROAD, headers=auth_headers)
        id1 = r1.json()["id"]
        id2 = r2.json()["id"]
        resp = await async_client.post(
            "/api/admin/complaints/bulk-status",
            json={"ids": [id1, id2], "status": "in_progress"},
            headers=admin_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["updated"] == 2

    @pytest.mark.asyncio
    async def test_admin_bulk_status_persists(self, async_client, auth_headers, admin_headers):
        r1 = await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        r2 = await async_client.post("/api/complaints", data=COMPLAINT_ROAD, headers=auth_headers)
        cid1 = r1.json()["complaint_id"]
        cid2 = r2.json()["complaint_id"]
        id1 = r1.json()["id"]
        id2 = r2.json()["id"]
        await async_client.post(
            "/api/admin/complaints/bulk-status",
            json={"ids": [id1, id2], "status": "resolved"},
            headers=admin_headers,
        )
        async with test_async_session_factory() as db:
            result = await db.execute(
                select(Complaint).where(Complaint.complaint_id.in_([cid1, cid2]))
            )
            complaints = list(result.scalars().all())
            assert all(c.status == "resolved" for c in complaints)

    @pytest.mark.asyncio
    async def test_admin_bulk_status_empty_ids_rejected(self, async_client, admin_headers):
        resp = await async_client.post(
            "/api/admin/complaints/bulk-status",
            json={"ids": [], "status": "resolved"},
            headers=admin_headers,
        )
        assert resp.status_code == 400

    @pytest.mark.asyncio
    async def test_admin_assign_requires_admin_role(self, async_client, auth_headers):
        create = await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        cid = create.json()["complaint_id"]
        resp = await async_client.put(
            f"/api/admin/complaints/{cid}/assign",
            json={"user_id": 1},
            headers=auth_headers,
        )
        assert resp.status_code == 403


# ============================================================
# SECTION 10: ADMIN - DASHBOARD & ANALYTICS
# ============================================================

class TestAdminDashboard:
    """Admin dashboard and analytics endpoints."""

    @pytest.mark.asyncio
    async def test_admin_dashboard(self, async_client, auth_headers, admin_headers):
        await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        resp = await async_client.get("/api/admin/dashboard", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "total_complaints" in data
        assert "total_users" in data
        assert "resolved" in data
        assert "pending" in data
        assert "critical" in data

    @pytest.mark.asyncio
    async def test_admin_analytics(self, async_client, auth_headers, admin_headers):
        await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        resp = await async_client.get("/api/admin/analytics", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "category_distribution" in data
        assert "status_distribution" in data
        assert "recent_complaints" in data

    @pytest.mark.asyncio
    async def test_admin_stats(self, async_client, auth_headers, admin_headers):
        await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        resp = await async_client.get("/api/admin/stats", headers=admin_headers)
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_complaint_stats_summary(self, async_client, auth_headers):
        await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        resp = await async_client.get("/api/complaints/stats/summary", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "total" in data
        assert "by_category" in data
        assert "by_status" in data
        assert "by_priority" in data


# ============================================================
# SECTION 11: DATABASE VERIFICATION
# ============================================================

class TestDatabasePersistence:
    """Verify every action correctly updates PostgreSQL (SQLite in test)."""

    @pytest.mark.asyncio
    async def test_complaint_record_complete(self, async_client, auth_headers, test_user):
        resp = await async_client.post(
            "/api/complaints", data=COMPLAINT_FULL, headers=auth_headers
        )
        cid = resp.json()["complaint_id"]
        async with test_async_session_factory() as db:
            result = await db.execute(select(Complaint).where(Complaint.complaint_id == cid))
            c = result.scalar_one()
            assert c.user_id == test_user.id
            assert c.title == COMPLAINT_FULL["title"]
            assert c.address == COMPLAINT_FULL["address"]
            assert c.village == "TechCity"
            assert c.district == "InnovateDistrict"
            assert c.pincode == "560001"
            assert c.latitude == pytest.approx(12.9716, abs=0.001)
            assert c.longitude == pytest.approx(77.5946, abs=0.001)
            assert c.is_anonymous is True
            assert c.status == "pending"
            assert c.created_at is not None

    @pytest.mark.asyncio
    async def test_complaint_update_record_persisted(self, async_client, auth_headers, test_user):
        create = await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        cid = create.json()["complaint_id"]
        await async_client.put(f"/api/complaints/{cid}", json={"status": "in_progress"}, headers=auth_headers)
        async with test_async_session_factory() as db:
            result = await db.execute(select(Complaint).where(Complaint.complaint_id == cid))
            complaint = result.scalar_one()
            update_result = await db.execute(
                select(ComplaintUpdate).where(ComplaintUpdate.complaint_id == complaint.id)
            )
            updates = list(update_result.scalars().all())
            assert len(updates) >= 1
            assert updates[0].user_id == test_user.id

    @pytest.mark.asyncio
    async def test_vote_persisted_in_db(self, async_client, auth_headers, test_user):
        create = await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        cid = create.json()["complaint_id"]
        await async_client.post(f"/api/complaints/{cid}/upvote", headers=auth_headers)
        async with test_async_session_factory() as db:
            result = await db.execute(select(Complaint).where(Complaint.complaint_id == cid))
            complaint = result.scalar_one()
            assert complaint.upvotes == 1
            vote_result = await db.execute(
                select(ComplaintVote).where(ComplaintVote.complaint_id == complaint.id)
            )
            votes = list(vote_result.scalars().all())
            assert len(votes) == 1
            assert votes[0].user_id == test_user.id

    @pytest.mark.asyncio
    async def test_resolved_at_persisted(self, async_client, auth_headers, test_user):
        create = await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        cid = create.json()["complaint_id"]
        await async_client.put(
            f"/api/complaints/{cid}",
            json={"status": "resolved", "resolution_notes": "Fixed."},
            headers=auth_headers,
        )
        async with test_async_session_factory() as db:
            result = await db.execute(select(Complaint).where(Complaint.complaint_id == cid))
            complaint = result.scalar_one()
            assert complaint.resolved_at is not None
            assert complaint.resolution_notes == "Fixed."

    @pytest.mark.asyncio
    async def test_multiple_complaints_different_users(self, async_client, auth_headers):
        from tests.conftest import test_async_session_factory
        async with test_async_session_factory() as db:
            user2 = User(
                email="dbtest2@example.com", username="dbtest2",
                hashed_password=AuthService.hash_password("DbTestPass1"),
                full_name="DB Test 2", village="TestVillage", district="TestDistrict",
                state="TestState", role="citizen",
            )
            db.add(user2)
            await db.commit()
            await db.refresh(user2)
        user2_token = AuthService.create_access_token(data={"sub": user2.id})
        user2_headers = {"Authorization": f"Bearer {user2_token}"}
        await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
        await async_client.post("/api/complaints", data=COMPLAINT_WATER, headers=user2_headers)
        async with test_async_session_factory() as db:
            total = await db.scalar(select(func.count(Complaint.id)))
            assert total == 2


# ============================================================
# SECTION 12: FULL LIFECYCLE E2E
# ============================================================

class TestFullLifecycleE2E:
    """End-to-end complaint lifecycle from creation to resolution."""

    @pytest.mark.asyncio
    async def test_full_lifecycle(self, async_client, auth_headers, admin_headers, test_user):
        # 1. Citizen creates complaint
        create = await async_client.post(
            "/api/complaints",
            data={
                "title": "Large pothole blocking traffic on Main Street",
                "description": "A huge pothole has formed near the bus stop blocking all traffic flow.",
                "address": "100 Main Street, near bus stop",
                "ward_number": "3",
                "village": "CenterCity",
                "district": "MetroDistrict",
            },
            headers=auth_headers,
        )
        assert create.status_code == 201
        cid = create.json()["complaint_id"]
        complaint_id = create.json()["id"]

        # 2. Citizen verifies it appears in their list
        my_list = await async_client.get("/api/complaints/my/all", headers=auth_headers)
        assert any(c["complaint_id"] == cid for c in my_list.json())

        # 3. Citizen tracks it
        track = await async_client.get(f"/api/complaints/{cid}", headers=auth_headers)
        assert track.status_code == 200
        assert track.json()["status"] == "pending"

        # 4. Admin views all complaints
        admin_list = await async_client.get("/api/admin/complaints", headers=admin_headers)
        assert admin_list.status_code == 200
        assert any(c["complaint_id"] == cid for c in admin_list.json()["items"])

        # 5. Admin assigns department
        assign = await async_client.put(
            f"/api/admin/complaints/{cid}/assign",
            json={"user_id": test_user.id},
            headers=admin_headers,
        )
        assert assign.status_code == 200

        # 6. Admin changes status to in_progress
        in_prog = await async_client.put(
            f"/api/complaints/{cid}",
            json={"status": "in_progress", "department": "Roads & Infrastructure"},
            headers=admin_headers,
        )
        assert in_prog.status_code == 200

        # 7. Admin resolves complaint
        resolve = await async_client.put(
            f"/api/complaints/{cid}",
            json={"status": "resolved", "resolution_notes": "Pothole filled and road repaired."},
            headers=admin_headers,
        )
        assert resolve.status_code == 200
        assert resolve.json()["resolved_at"] is not None

        # 8. Verify timeline has all status changes
        timeline = await async_client.get(f"/api/complaints/{cid}/updates", headers=auth_headers)
        statuses = [u["status"] for u in timeline.json()]
        assert "in_progress" in statuses
        assert "resolved" in statuses

        # 9. Verify citizen stats updated
        stats = await async_client.get("/api/complaints/my/stats", headers=auth_headers)
        assert stats.json()["resolved"] >= 1

        # 10. Verify admin dashboard updated
        dashboard = await async_client.get("/api/admin/dashboard", headers=admin_headers)
        assert dashboard.json()["resolved"] >= 1

    @pytest.mark.asyncio
    async def test_bulk_action_lifecycle(self, async_client, auth_headers, admin_headers):
        # Create 3 complaints
        ids = []
        for _ in range(3):
            r = await async_client.post("/api/complaints", data=COMPLAINT_MINIMAL, headers=auth_headers)
            ids.append(r.json()["id"])

        # Bulk update to in_progress
        resp = await async_client.post(
            "/api/admin/complaints/bulk-status",
            json={"ids": ids, "status": "in_progress"},
            headers=admin_headers,
        )
        assert resp.json()["updated"] == 3

        # Bulk resolve
        resp = await async_client.post(
            "/api/admin/complaints/bulk-status",
            json={"ids": ids, "status": "resolved"},
            headers=admin_headers,
        )
        assert resp.json()["updated"] == 3

        # Verify all resolved
        async with test_async_session_factory() as db:
            result = await db.execute(select(Complaint).where(Complaint.id.in_(ids)))
            complaints = list(result.scalars().all())
            assert all(c.status == "resolved" for c in complaints)

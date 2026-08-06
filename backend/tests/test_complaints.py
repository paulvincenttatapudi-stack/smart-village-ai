import pytest
from app.services.auth_service import AuthService

COMPLAINT_DATA = {
    "title": "Large pothole on Main Road",
    "description": "There is a large pothole near the market area causing traffic issues.",
    "address": "123 Main Road, near market",
    "ward_number": "3",
    "village": "TestVillage",
    "district": "TestDistrict",
    "latitude": "12.34",
    "longitude": "56.78",
}


class TestCreateComplaint:
    @pytest.mark.asyncio
    async def test_create_complaint_as_citizen(self, async_client, auth_headers):
        response = await async_client.post(
            "/api/complaints", data=COMPLAINT_DATA, headers=auth_headers
        )
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == COMPLAINT_DATA["title"]
        assert data["complaint_id"].startswith("SV")
        assert data["status"] == "pending"

    @pytest.mark.asyncio
    async def test_create_complaint_unauthenticated(self, async_client):
        response = await async_client.post("/api/complaints", data=COMPLAINT_DATA)
        assert response.status_code == 401


class TestListComplaints:
    @pytest.mark.asyncio
    async def test_list_complaints(self, async_client, auth_headers, test_user):
        await async_client.post(
            "/api/complaints", data=COMPLAINT_DATA, headers=auth_headers
        )
        response = await async_client.get("/api/complaints", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
        assert data["page"] == 1
        assert data["page_size"] == 10
        assert "items" in data

    @pytest.mark.asyncio
    async def test_list_complaints_with_filters(self, async_client, auth_headers):
        await async_client.post(
            "/api/complaints", data=COMPLAINT_DATA, headers=auth_headers
        )
        response = await async_client.get(
            "/api/complaints", params={"status": "pending"}, headers=auth_headers
        )
        assert response.status_code == 200


class TestGetComplaint:
    @pytest.mark.asyncio
    async def test_get_complaint(self, async_client, auth_headers):
        create_resp = await async_client.post(
            "/api/complaints", data=COMPLAINT_DATA, headers=auth_headers
        )
        cid = create_resp.json()["complaint_id"]
        response = await async_client.get(f"/api/complaints/{cid}", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["complaint_id"] == cid

    @pytest.mark.asyncio
    async def test_get_nonexistent_complaint(self, async_client, auth_headers):
        response = await async_client.get("/api/complaints/SV999999", headers=auth_headers)
        assert response.status_code == 404


class TestUpvote:
    @pytest.mark.asyncio
    async def test_upvote_complaint(self, async_client, auth_headers):
        create_resp = await async_client.post(
            "/api/complaints", data=COMPLAINT_DATA, headers=auth_headers
        )
        cid = create_resp.json()["complaint_id"]
        response = await async_client.post(
            f"/api/complaints/{cid}/upvote", headers=auth_headers
        )
        assert response.status_code == 200
        assert response.json()["upvoted"] is True
        assert response.json()["upvotes"] == 1

    @pytest.mark.asyncio
    async def test_duplicate_upvote(self, async_client, auth_headers):
        create_resp = await async_client.post(
            "/api/complaints", data=COMPLAINT_DATA, headers=auth_headers
        )
        cid = create_resp.json()["complaint_id"]
        await async_client.post(f"/api/complaints/{cid}/upvote", headers=auth_headers)
        response = await async_client.post(
            f"/api/complaints/{cid}/upvote", headers=auth_headers
        )
        assert response.status_code == 200
        assert response.json()["upvoted"] is False
        assert response.json()["upvotes"] == 0


class TestUpdateComplaint:
    @pytest.mark.asyncio
    async def test_update_complaint_by_owner(self, async_client, auth_headers):
        create_resp = await async_client.post(
            "/api/complaints", data=COMPLAINT_DATA, headers=auth_headers
        )
        cid = create_resp.json()["complaint_id"]
        response = await async_client.put(
            f"/api/complaints/{cid}",
            json={"status": "in_progress"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["status"] == "in_progress"

    @pytest.mark.asyncio
    async def test_update_complaint_by_admin(
        self, async_client, auth_headers, admin_headers
    ):
        create_resp = await async_client.post(
            "/api/complaints", data=COMPLAINT_DATA, headers=auth_headers
        )
        cid = create_resp.json()["complaint_id"]
        response = await async_client.put(
            f"/api/complaints/{cid}",
            json={"status": "resolved", "resolution_notes": "Fixed"},
            headers=admin_headers,
        )
        assert response.status_code == 200
        assert response.json()["status"] == "resolved"

    @pytest.mark.asyncio
    async def test_update_complaint_by_other(self, async_client, auth_headers):
        from tests.conftest import test_async_session_factory
        from app.models.user import User

        async with test_async_session_factory() as db:
            other = User(
                email="other@example.com",
                username="otheruser",
                hashed_password=AuthService.hash_password("OtherPass1"),
                full_name="Other User",
                village="TestVillage",
                district="TestDistrict",
                state="TestState",
                role="citizen",
            )
            db.add(other)
            await db.commit()
            await db.refresh(other)
        other_token = AuthService.create_access_token(data={"sub": other.id})
        other_headers = {"Authorization": f"Bearer {other_token}"}

        create_resp = await async_client.post(
            "/api/complaints", data=COMPLAINT_DATA, headers=auth_headers
        )
        cid = create_resp.json()["complaint_id"]
        response = await async_client.put(
            f"/api/complaints/{cid}",
            json={"status": "in_progress"},
            headers=other_headers,
        )
        assert response.status_code == 403


class TestGetUpdates:
    @pytest.mark.asyncio
    async def test_get_complaint_updates(self, async_client, auth_headers):
        create_resp = await async_client.post(
            "/api/complaints", data=COMPLAINT_DATA, headers=auth_headers
        )
        cid = create_resp.json()["complaint_id"]
        response = await async_client.get(f"/api/complaints/{cid}/updates", headers=auth_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestMyComplaints:
    @pytest.mark.asyncio
    async def test_get_my_complaints(self, async_client, auth_headers):
        await async_client.post(
            "/api/complaints", data=COMPLAINT_DATA, headers=auth_headers
        )
        response = await async_client.get(
            "/api/complaints/my/all", headers=auth_headers
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        assert len(response.json()) >= 1

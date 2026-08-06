import pytest

COMPLAINT_DATA = {
    "title": "Pothole in admin test",
    "description": "A pothole on the road near the school.",
    "address": "Near School, Main Road",
    "ward_number": "2",
    "village": "TestVillage",
    "district": "TestDistrict",
}


class TestAdminUsers:
    @pytest.mark.asyncio
    async def test_admin_list_users(self, async_client, admin_headers):
        response = await async_client.get("/api/admin/users", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "items" in data
        assert len(data["items"]) >= 1

    @pytest.mark.asyncio
    async def test_non_admin_cannot_list_users(self, async_client, auth_headers):
        response = await async_client.get("/api/admin/users", headers=auth_headers)
        assert response.status_code == 403


class TestAdminComplaints:
    @pytest.mark.asyncio
    async def test_admin_list_complaints(self, async_client, admin_headers):
        response = await async_client.get(
            "/api/admin/complaints", headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "items" in data

    @pytest.mark.asyncio
    async def test_admin_assign_complaint(
        self, async_client, auth_headers, admin_headers, test_admin
    ):
        create_resp = await async_client.post(
            "/api/complaints", data=COMPLAINT_DATA, headers=auth_headers
        )
        cid = create_resp.json()["complaint_id"]
        response = await async_client.put(
            f"/api/admin/complaints/{cid}/assign",
            json={"user_id": test_admin.id},
            headers=admin_headers,
        )
        assert response.status_code == 200
        assert "assigned" in response.json()["message"]

    @pytest.mark.asyncio
    async def test_admin_stats(self, async_client, admin_headers):
        response = await async_client.get("/api/admin/stats", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_complaints" in data
        assert "total_users" in data

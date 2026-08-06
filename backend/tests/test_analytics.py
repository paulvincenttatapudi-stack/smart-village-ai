import pytest


async def _seed_complaint(async_client, auth_headers):
    resp = await async_client.post(
        "/api/complaints",
        data={
            "title": "Pothole on Main Road",
            "description": "Large pothole on Main Road near the market causing traffic issues.",
            "address": "123 Main Road",
            "ward_number": "3",
            "village": "TestVillage",
            "district": "TestDistrict",
        },
        headers=auth_headers,
    )
    return resp.json()


class TestAnalyticsOverview:
    @pytest.mark.asyncio
    async def test_analytics_overview(self, async_client, auth_headers):
        await _seed_complaint(async_client, auth_headers)
        response = await async_client.get("/api/analytics/overview", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_complaints" in data
        assert "total_users" in data
        assert "total_resolved" in data
        assert "total_pending" in data
        assert data["total_complaints"] >= 1

    @pytest.mark.asyncio
    async def test_analytics_hotspots(self, async_client, auth_headers):
        await _seed_complaint(async_client, auth_headers)
        response = await async_client.get("/api/analytics/hotspots", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_analytics_trends(self, async_client, auth_headers):
        await _seed_complaint(async_client, auth_headers)
        response = await async_client.get("/api/analytics/trends", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_analytics_departments(self, async_client, auth_headers):
        await _seed_complaint(async_client, auth_headers)
        response = await async_client.get("/api/analytics/departments", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

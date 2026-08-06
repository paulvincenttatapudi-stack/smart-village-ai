import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.notification import Notification
from app.services.notification_service import NotificationService
from tests.conftest import test_async_session_factory


async def create_notification_for_user(user_id: int):
    async with test_async_session_factory() as db:
        notification = Notification(
            user_id=user_id,
            title="Test Notification",
            message="This is a test notification",
            type="info",
        )
        db.add(notification)
        await db.commit()


class TestListNotifications:
    @pytest.mark.asyncio
    async def test_list_notifications(
        self, async_client, auth_headers, test_user
    ):
        await create_notification_for_user(test_user.id)
        response = await async_client.get(
            "/api/notifications", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    @pytest.mark.asyncio
    async def test_mark_as_read(self, async_client, auth_headers, test_user):
        await create_notification_for_user(test_user.id)
        list_resp = await async_client.get("/api/notifications", headers=auth_headers)
        nid = list_resp.json()[0]["id"]
        response = await async_client.put(
            f"/api/notifications/{nid}/read", headers=auth_headers
        )
        assert response.status_code == 200
        assert response.json()["message"] == "Notification marked as read"

    @pytest.mark.asyncio
    async def test_unread_count(self, async_client, auth_headers, test_user):
        await create_notification_for_user(test_user.id)
        response = await async_client.get(
            "/api/notifications/unread-count", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "unread_count" in data
        assert data["unread_count"] >= 1

import pytest
from fastapi.testclient import TestClient
from app.services.auth_service import AuthService
from tests.conftest import app, test_user


class TestChatWebSocket:
    @pytest.mark.asyncio
    async def test_chat_websocket_connect(self, test_user):
        token = AuthService.create_access_token(data={"sub": test_user.id})
        client = TestClient(app)
        with client.websocket_connect(f"/ws/chat?token={token}") as ws:
            pass

    @pytest.mark.asyncio
    async def test_chat_websocket_connect_no_token(self):
        client = TestClient(app)
        with pytest.raises(Exception):
            with client.websocket_connect("/ws/chat") as ws:
                ws.receive_text()

    @pytest.mark.asyncio
    async def test_chat_websocket_send_message(self, test_user):
        token = AuthService.create_access_token(data={"sub": test_user.id})
        client = TestClient(app)
        with client.websocket_connect(f"/ws/chat?token={token}") as ws:
            ws.send_json({"message": "help"})
            data = ws.receive_json()
            assert data["type"] == "chat"
            assert "reply" in data

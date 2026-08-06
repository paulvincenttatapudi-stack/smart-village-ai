import json
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.database import async_session_factory
from app.models.user import User
from app.models.notification import Notification
from app.services.auth_service import AuthService
from app.services.ai_service import AIService

router = APIRouter()


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: int):
        self.active_connections.pop(user_id, None)

    async def send_personal_message(self, message: dict, user_id: int):
        ws = self.active_connections.get(user_id)
        if ws:
            try:
                await ws.send_json(message)
            except Exception as e:
                logger.debug("WS send failed for user_id={}: {}", user_id, e)
                self.disconnect(user_id)

    async def broadcast(self, message: dict):
        disconnected = []
        for uid, ws in self.active_connections.items():
            try:
                await ws.send_json(message)
            except Exception:
                disconnected.append(uid)
        for uid in disconnected:
            self.disconnect(uid)

    def is_connected(self, user_id: int) -> bool:
        return user_id in self.active_connections


manager = ConnectionManager()


async def get_user_from_token(token: str) -> Optional[User]:
    try:
        payload = AuthService.decode_token(token)
        user_id: int = payload.get("sub")
        if user_id is None:
            logger.warning("WS auth: missing sub in token payload")
            return None
        async with async_session_factory() as db:
            result = await db.execute(select(User).where(User.id == int(user_id)))
            user = result.scalar_one_or_none()
            if not user:
                logger.warning("WS auth: user not found for id={}", user_id)
            return user
    except Exception as e:
        logger.warning("WS auth failed: {}", e)
        return None


@router.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket, token: str = Query(...)):
    user = await get_user_from_token(token)
    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await manager.connect(websocket, user.id)
    logger.info("WS chat connected: user_id={}", user.id)
    try:
        while True:
            data = await websocket.receive_json()
            message = data.get("message", "")
            if not message:
                continue

            async with async_session_factory() as db:
                result = await AIService().chat_with_assistant(db, message, user.id)
                await manager.send_personal_message({
                    "type": "chat",
                    "reply": result["reply"],
                    "data": result.get("data"),
                }, user.id)
    except WebSocketDisconnect:
        logger.info("WS chat disconnected: user_id={}", user.id)
        manager.disconnect(user.id)
    except Exception as e:
        logger.error("WS chat error for user_id={}: {}", user.id, e)
        manager.disconnect(user.id)


@router.websocket("/ws/notifications")
async def websocket_notifications(websocket: WebSocket, token: str = Query(...)):
    user = await get_user_from_token(token)
    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await manager.connect(websocket, user.id)
    logger.info("WS notifications connected: user_id={}", user.id)
    try:
        async with async_session_factory() as db:
            result = await db.execute(
                select(Notification)
                .where(Notification.user_id == user.id, Notification.is_read == False)
                .order_by(Notification.created_at.desc())
                .limit(10)
            )
            notifications = list(result.scalars().all())
            if notifications:
                await manager.send_personal_message({
                    "type": "notifications",
                    "notifications": [
                        {"id": n.id, "title": n.title, "message": n.message, "type": n.type}
                        for n in notifications
                    ],
                }, user.id)

        while True:
            data = await websocket.receive_json()
            if data.get("type") == "ping":
                await manager.send_personal_message({"type": "pong"}, user.id)
    except WebSocketDisconnect:
        logger.info("WS notifications disconnected: user_id={}", user.id)
        manager.disconnect(user.id)
    except Exception as e:
        logger.error("WS notifications error for user_id={}: {}", user.id, e)
        manager.disconnect(user.id)

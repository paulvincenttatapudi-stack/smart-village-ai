from fastapi import APIRouter, Depends, status
from sqlalchemy import select, desc, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.chat import ChatMessage
from app.schemas.chat import ChatRequest, ChatResponse, ChatMessageResponse
from app.services.auth_service import AuthService
from app.services.ai_service import AIService

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_user),
):
    result = await AIService().chat_with_assistant(db, body.message, current_user.id)
    return ChatResponse(reply=result["reply"], data=result.get("data"))


@router.get("/history", response_model=list[ChatMessageResponse])
async def get_chat_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_user),
):
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.user_id == current_user.id)
        .order_by(desc(ChatMessage.created_at))
        .limit(50)
    )
    messages = list(result.scalars().all())
    messages.reverse()
    return [ChatMessageResponse.model_validate(m) for m in messages]


@router.delete("/history", response_model=dict)
async def delete_chat_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_user),
):
    await db.execute(delete(ChatMessage).where(ChatMessage.user_id == current_user.id))
    return {"message": "Chat history deleted"}

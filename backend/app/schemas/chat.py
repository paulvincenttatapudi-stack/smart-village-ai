from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, ConfigDict


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)


class ChatResponse(BaseModel):
    reply: str
    data: Optional[dict] = None


class ChatMessageResponse(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

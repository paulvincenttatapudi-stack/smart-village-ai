from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    type: str
    complaint_id: Optional[int] = None
    is_read: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

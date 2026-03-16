from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ConversationCreate(BaseModel):
    title: Optional[str] = None
    context_type: str = "general"
    context_id: Optional[str] = None


class ConversationResponse(BaseModel):
    id: str
    title: Optional[str] = None
    context_type: Optional[str] = None
    context_id: Optional[str] = None
    messages: list[dict] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

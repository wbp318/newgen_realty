from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ConversationCreate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    context_type: str = Field("general", max_length=50)
    context_id: Optional[str] = Field(None, max_length=36)


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

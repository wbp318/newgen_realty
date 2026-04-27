from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.schemas._validators import BoundedJSONDict


class ActivityCreate(BaseModel):
    activity_type: str = Field(..., max_length=30)
    title: str = Field(..., max_length=200)
    description: Optional[str] = Field(None, max_length=5000)
    contact_id: Optional[str] = Field(None, max_length=36)
    property_id: Optional[str] = Field(None, max_length=36)
    prospect_id: Optional[str] = Field(None, max_length=36)
    extra_data: Optional[BoundedJSONDict] = None


class ActivityResponse(BaseModel):
    id: str
    activity_type: str
    title: str
    description: Optional[str] = None
    contact_id: Optional[str] = None
    property_id: Optional[str] = None
    prospect_id: Optional[str] = None
    extra_data: Optional[dict] = None
    created_at: datetime

    class Config:
        from_attributes = True

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ActivityCreate(BaseModel):
    activity_type: str
    title: str
    description: Optional[str] = None
    contact_id: Optional[str] = None
    property_id: Optional[str] = None
    extra_data: Optional[dict] = None


class ActivityResponse(BaseModel):
    id: str
    activity_type: str
    title: str
    description: Optional[str] = None
    contact_id: Optional[str] = None
    property_id: Optional[str] = None
    extra_data: Optional[dict] = None
    created_at: datetime

    class Config:
        from_attributes = True

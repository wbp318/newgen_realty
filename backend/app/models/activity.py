import enum
import uuid

from sqlalchemy import Column, DateTime, String, Text, func
from sqlalchemy import JSON

from app.database import Base


class ActivityType(str, enum.Enum):
    CALL = "call"
    EMAIL = "email"
    TEXT = "text"
    SHOWING = "showing"
    MEETING = "meeting"
    NOTE = "note"
    AI_ACTION = "ai_action"
    STATUS_CHANGE = "status_change"
    OFFER = "offer"


class Activity(Base):
    __tablename__ = "activities"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    activity_type = Column(String(20), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    # Link to contact, property, and/or prospect (nullable — can be any combination)
    contact_id = Column(String(36), index=True)
    property_id = Column(String(36), index=True)
    prospect_id = Column(String(36), index=True)
    extra_data = Column(JSON, default=dict)
    created_at = Column(DateTime, server_default=func.now())

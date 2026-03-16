import uuid

from sqlalchemy import Column, DateTime, String, func
from sqlalchemy import JSON

from app.database import Base


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255))
    context_type = Column(String(50))  # "general", "listing", "comp_analysis", "comm_draft"
    context_id = Column(String(36))
    messages = Column(JSON, default=list)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

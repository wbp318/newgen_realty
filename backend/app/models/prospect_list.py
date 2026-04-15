import uuid

from sqlalchemy import Column, DateTime, Integer, String, Text, func
from sqlalchemy import JSON

from app.database import Base


class ProspectList(Base):
    __tablename__ = "prospect_lists"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text)
    search_criteria = Column(JSON, default=dict)
    prospect_count = Column(Integer, default=0)
    prospect_ids = Column(JSON, default=list)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

import enum
import uuid

from sqlalchemy import Column, DateTime, Float, Integer, String, Text, func
from sqlalchemy import JSON

from app.database import Base


class ContactType(str, enum.Enum):
    BUYER = "buyer"
    SELLER = "seller"
    BOTH = "both"
    LEAD = "lead"


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255))
    phone = Column(String(20))
    contact_type = Column(String(10), default=ContactType.LEAD.value)
    preferred_parishes = Column(JSON, default=list)
    budget_min = Column(Integer)
    budget_max = Column(Integer)
    preferred_property_types = Column(JSON, default=list)
    preferred_cities = Column(JSON, default=list)
    source = Column(String(50))
    last_contact_date = Column(DateTime)
    ai_lead_score = Column(Float)
    ai_lead_score_reason = Column(Text)
    notes = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

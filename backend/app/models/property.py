import enum
import uuid

from sqlalchemy import Column, DateTime, Float, Integer, String, Text, func
from sqlalchemy import JSON

from app.database import Base


class PropertyStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PENDING = "pending"
    SOLD = "sold"
    WITHDRAWN = "withdrawn"


class PropertyType(str, enum.Enum):
    SINGLE_FAMILY = "single_family"
    MULTI_FAMILY = "multi_family"
    CONDO = "condo"
    TOWNHOUSE = "townhouse"
    LAND = "land"
    COMMERCIAL = "commercial"


class Property(Base):
    __tablename__ = "properties"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    # Address
    street_address = Column(String(255), nullable=False)
    city = Column(String(100), nullable=False)
    parish = Column(String(100), nullable=False)
    state = Column(String(2), default="LA")
    zip_code = Column(String(10), nullable=False)
    # Details
    property_type = Column(String(20), nullable=False)
    status = Column(String(20), default=PropertyStatus.DRAFT.value)
    bedrooms = Column(Integer)
    bathrooms = Column(Float)
    sqft = Column(Integer)
    lot_size_acres = Column(Float)
    year_built = Column(Integer)
    # Pricing
    asking_price = Column(Integer)
    ai_suggested_price = Column(Integer)
    # AI-generated content
    ai_description = Column(Text)
    ai_description_generated_at = Column(DateTime)
    # Geographic coordinates (Phase 4A)
    latitude = Column(Float)
    longitude = Column(Float)
    geocoded_at = Column(DateTime)
    # Metadata
    features = Column(JSON, default=dict)
    photos = Column(JSON, default=list)
    mls_number = Column(String(50))
    notes = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

import enum
import uuid

from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, Text, func
from sqlalchemy import JSON

from app.database import Base


class ProspectType(str, enum.Enum):
    ABSENTEE_OWNER = "absentee_owner"
    PRE_FORECLOSURE = "pre_foreclosure"
    PROBATE = "probate"
    LONG_TERM_OWNER = "long_term_owner"
    EXPIRED_LISTING = "expired_listing"
    FSBO = "fsbo"
    VACANT = "vacant"
    TAX_DELINQUENT = "tax_delinquent"


class ProspectStatus(str, enum.Enum):
    NEW = "new"
    RESEARCHING = "researching"
    QUALIFIED = "qualified"
    CONTACTED = "contacted"
    RESPONDING = "responding"
    CONVERTED = "converted"
    NOT_INTERESTED = "not_interested"
    DO_NOT_CONTACT = "do_not_contact"


class ConsentStatus(str, enum.Enum):
    NONE = "none"
    PENDING = "pending"
    GRANTED = "granted"
    DENIED = "denied"
    REVOKED = "revoked"


class Prospect(Base):
    __tablename__ = "prospects"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    # Owner info
    first_name = Column(String(100))
    last_name = Column(String(100))
    email = Column(String(255))
    phone = Column(String(20))
    mailing_address = Column(String(500))
    # Property info
    property_address = Column(String(500), nullable=False)
    property_city = Column(String(100))
    property_parish = Column(String(100))
    property_state = Column(String(2), default="LA")
    property_zip = Column(String(10))
    # Classification
    prospect_type = Column(String(30), nullable=False)
    status = Column(String(20), default=ProspectStatus.NEW.value)
    # Data signals (flexible JSON for different lead types)
    motivation_signals = Column(JSON, default=dict)
    property_data = Column(JSON, default=dict)
    # AI scoring
    ai_prospect_score = Column(Float)
    ai_prospect_score_reason = Column(Text)
    ai_scored_at = Column(DateTime)
    # TCPA compliance
    consent_status = Column(String(20), default=ConsentStatus.NONE.value)
    consent_date = Column(DateTime)
    consent_method = Column(String(50))
    dnc_checked = Column(Boolean, default=False)
    dnc_checked_at = Column(DateTime)
    dnc_listed = Column(Boolean, default=False)
    opt_out_date = Column(DateTime)
    opt_out_processed = Column(Boolean, default=False)
    contact_window_timezone = Column(String(50))
    # Geographic coordinates (Phase 4A)
    property_latitude = Column(Float)
    property_longitude = Column(Float)
    geocoded_at = Column(DateTime)
    # Linking
    contact_id = Column(String(36), index=True)
    data_source = Column(String(50), default="manual")
    source_record_id = Column(String(100))
    # Metadata
    notes = Column(Text)
    tags = Column(JSON, default=list)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

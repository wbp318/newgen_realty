import enum
import uuid

from sqlalchemy import Boolean, Column, DateTime, Float, Index, Integer, String, Text, UniqueConstraint, func
from sqlalchemy import JSON

from app.database import Base


class CampaignStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"


class MessageStatus(str, enum.Enum):
    DRAFT = "draft"
    QUEUED = "queued"
    SENT = "sent"
    DELIVERED = "delivered"
    OPENED = "opened"
    REPLIED = "replied"
    BOUNCED = "bounced"
    FAILED = "failed"


class OutreachCampaign(Base):
    __tablename__ = "outreach_campaigns"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text)
    campaign_type = Column(String(20))
    status = Column(String(20), default=CampaignStatus.DRAFT.value)
    prospect_list_id = Column(String(36), index=True)
    # Template / AI config
    message_template = Column(Text)
    ai_personalize = Column(Boolean, default=True)
    # Stats
    total_messages = Column(Integer, default=0)
    sent_count = Column(Integer, default=0)
    delivered_count = Column(Integer, default=0)
    opened_count = Column(Integer, default=0)
    replied_count = Column(Integer, default=0)
    # AI insights
    ai_campaign_insights = Column(Text)
    ai_insights_generated_at = Column(DateTime)
    # Drip scheduling
    sequence_config = Column(JSON)  # list of {step, day_offset, medium, tone_override}
    send_window_start = Column(Integer, default=9)  # local hour 0-23
    send_window_end = Column(Integer, default=18)
    daily_send_cap = Column(Integer)  # optional per-campaign override
    started_at = Column(DateTime)
    # Metadata
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class OutreachMessage(Base):
    __tablename__ = "outreach_messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    campaign_id = Column(String(36), index=True, nullable=False)
    prospect_id = Column(String(36), index=True, nullable=False)
    # Message content
    medium = Column(String(20), nullable=False)
    subject = Column(String(500))
    body = Column(Text, nullable=False)
    # Status tracking
    status = Column(String(20), default=MessageStatus.DRAFT.value, index=True)
    scheduled_send_time = Column(DateTime, index=True)
    sequence_step = Column(Integer, default=1)
    sent_at = Column(DateTime)
    delivered_at = Column(DateTime)
    opened_at = Column(DateTime)
    replied_at = Column(DateTime)
    # Provider tracking
    provider = Column(String(20))  # "resend", "twilio", "vapi"
    provider_message_id = Column(String(100))
    last_error = Column(Text)
    retry_count = Column(Integer, default=0)
    extra_data = Column(JSON)  # transcripts, reply bodies, raw events
    # TCPA compliance snapshot
    consent_verified = Column(Boolean, default=False)
    dnc_cleared = Column(Boolean, default=False)
    compliance_notes = Column(Text)
    # Metadata
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("campaign_id", "prospect_id", "sequence_step",
                         name="uq_message_campaign_prospect_step"),
        Index("ix_message_sweep", "status", "scheduled_send_time"),
    )

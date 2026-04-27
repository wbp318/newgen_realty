from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class SequenceStep(BaseModel):
    step: int = Field(..., ge=1)
    day_offset: int = Field(0, ge=0, le=365)
    medium: str = Field(..., max_length=20)
    tone_override: Optional[str] = Field(None, max_length=50)


class OutreachCampaignCreate(BaseModel):
    name: str = Field(..., max_length=255)
    description: Optional[str] = Field(None, max_length=2000)
    campaign_type: str = Field("email", max_length=20)
    prospect_list_id: Optional[str] = Field(None, max_length=36)
    message_template: Optional[str] = Field(None, max_length=5000)
    ai_personalize: bool = True
    sequence_config: Optional[list[SequenceStep]] = Field(None, max_length=20)
    send_window_start: Optional[int] = Field(None, ge=0, le=23)
    send_window_end: Optional[int] = Field(None, ge=1, le=24)
    daily_send_cap: Optional[int] = Field(None, ge=1, le=10000)


class OutreachCampaignUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = Field(None, max_length=2000)
    status: Optional[str] = Field(None, max_length=20)
    campaign_type: Optional[str] = Field(None, max_length=20)
    prospect_list_id: Optional[str] = Field(None, max_length=36)
    message_template: Optional[str] = Field(None, max_length=5000)
    ai_personalize: Optional[bool] = None
    sequence_config: Optional[list[SequenceStep]] = Field(None, max_length=20)
    send_window_start: Optional[int] = Field(None, ge=0, le=23)
    send_window_end: Optional[int] = Field(None, ge=1, le=24)
    daily_send_cap: Optional[int] = Field(None, ge=1, le=10000)


class OutreachCampaignResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    campaign_type: Optional[str] = None
    status: str
    prospect_list_id: Optional[str] = None
    message_template: Optional[str] = None
    ai_personalize: bool
    total_messages: int
    sent_count: int
    delivered_count: int
    opened_count: int
    replied_count: int
    ai_campaign_insights: Optional[str] = None
    ai_insights_generated_at: Optional[datetime] = None
    sequence_config: Optional[list[dict[str, Any]]] = None
    send_window_start: Optional[int] = None
    send_window_end: Optional[int] = None
    daily_send_cap: Optional[int] = None
    started_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class OutreachMessageResponse(BaseModel):
    id: str
    campaign_id: str
    prospect_id: str
    medium: str
    subject: Optional[str] = None
    body: str
    status: str
    scheduled_send_time: Optional[datetime] = None
    sequence_step: Optional[int] = None
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    opened_at: Optional[datetime] = None
    replied_at: Optional[datetime] = None
    provider: Optional[str] = None
    provider_message_id: Optional[str] = None
    last_error: Optional[str] = None
    retry_count: Optional[int] = None
    extra_data: Optional[dict[str, Any]] = None
    consent_verified: bool
    dnc_cleared: bool
    compliance_notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class GenerateMessageRequest(BaseModel):
    campaign_id: str = Field(..., max_length=36)
    prospect_id: str = Field(..., max_length=36)
    medium: str = Field("email", max_length=20)
    tone: str = Field("professional", max_length=20)


class GenerateMessageResponse(BaseModel):
    subject: Optional[str] = None
    body: str
    compliance_flags: list[str]


class CampaignStatsResponse(BaseModel):
    campaign_id: str
    total: int
    queued: int
    sent: int
    delivered: int
    opened: int
    replied: int
    bounced: int
    failed: int
    # Rates as 0-1 floats; 0 when the denominator is 0.
    delivery_rate: float
    open_rate: float
    reply_rate: float


class CampaignInsightsResponse(BaseModel):
    campaign_id: str
    total_sent: int
    response_rate: float
    top_performing_prospect_types: list[str]
    suggestions: list[str]
    raw_analysis: str

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class OutreachCampaignCreate(BaseModel):
    name: str
    description: Optional[str] = None
    campaign_type: str = "email"
    prospect_list_id: Optional[str] = None
    message_template: Optional[str] = None
    ai_personalize: bool = True


class OutreachCampaignUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    campaign_type: Optional[str] = None
    prospect_list_id: Optional[str] = None
    message_template: Optional[str] = None
    ai_personalize: Optional[bool] = None


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
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    opened_at: Optional[datetime] = None
    replied_at: Optional[datetime] = None
    consent_verified: bool
    dnc_cleared: bool
    compliance_notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class GenerateMessageRequest(BaseModel):
    campaign_id: str
    prospect_id: str
    medium: str = "email"
    tone: str = "professional"


class GenerateMessageResponse(BaseModel):
    subject: Optional[str] = None
    body: str
    compliance_flags: list[str]


class CampaignInsightsResponse(BaseModel):
    campaign_id: str
    total_sent: int
    response_rate: float
    top_performing_prospect_types: list[str]
    suggestions: list[str]
    raw_analysis: str

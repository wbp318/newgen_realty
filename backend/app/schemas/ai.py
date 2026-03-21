from typing import Optional

from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    conversation_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    conversation_id: str


class ListingRequest(BaseModel):
    street_address: str
    city: str
    parish: str
    state: str = "LA"
    property_type: str
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    sqft: Optional[int] = None
    lot_size_acres: Optional[float] = None
    year_built: Optional[int] = None
    asking_price: Optional[int] = None
    features: Optional[dict] = None
    notes: Optional[str] = None
    tone: str = "professional"  # professional, luxury, casual, investor


class ListingResponse(BaseModel):
    description: str
    headline: str


class CompData(BaseModel):
    address: str
    sale_price: int
    sqft: Optional[int] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    sale_date: Optional[str] = None
    notes: Optional[str] = None


class CompAnalysisRequest(BaseModel):
    subject_address: str
    subject_sqft: Optional[int] = None
    subject_bedrooms: Optional[int] = None
    subject_bathrooms: Optional[float] = None
    subject_lot_acres: Optional[float] = None
    subject_year_built: Optional[int] = None
    subject_features: Optional[dict] = None
    comps: list[CompData]


class CompAnalysisResponse(BaseModel):
    suggested_price: int
    price_range_low: int
    price_range_high: int
    analysis: str


class CommDraftRequest(BaseModel):
    recipient_name: str
    purpose: str  # "initial_outreach", "follow_up", "price_reduction", "offer_received", "closing_update"
    context: Optional[str] = None
    tone: str = "professional"  # professional, friendly, urgent
    medium: str = "email"  # email, text


class CommDraftResponse(BaseModel):
    subject: Optional[str] = None  # email only
    body: str


# --- Lead Scoring ---

class LeadScoreRequest(BaseModel):
    contact_id: str


class LeadScoreResponse(BaseModel):
    contact_id: str
    score: float
    reason: str
    suggested_action: Optional[str] = None


# --- Property Matching ---

class PropertyMatchRequest(BaseModel):
    contact_id: str


class PropertyMatchItem(BaseModel):
    property_id: str
    match_score: int
    reason: str


class PropertyMatchResponse(BaseModel):
    contact_id: str
    matches: list[PropertyMatchItem]


# --- Dashboard Insights ---

class DashboardInsightsResponse(BaseModel):
    insights: list[str]
    actions: list[str]
    opportunities: list[str]
    raw_analysis: str

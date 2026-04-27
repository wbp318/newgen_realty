from typing import Optional

from pydantic import BaseModel, Field

from app.schemas._validators import BoundedJSONDict


class ChatMessage(BaseModel):
    role: str = Field(..., max_length=20)  # "user" or "assistant"
    content: str = Field(..., max_length=20000)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(..., max_length=100)
    conversation_id: Optional[str] = Field(None, max_length=36)


class ChatResponse(BaseModel):
    response: str
    conversation_id: str


class ListingRequest(BaseModel):
    street_address: str = Field(..., max_length=500)
    city: str = Field(..., max_length=100)
    parish: str = Field(..., max_length=100)
    state: str = Field("LA", max_length=2)
    property_type: str = Field(..., max_length=20)
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    sqft: Optional[int] = None
    lot_size_acres: Optional[float] = None
    year_built: Optional[int] = None
    asking_price: Optional[int] = None
    features: Optional[BoundedJSONDict] = None
    notes: Optional[str] = Field(None, max_length=5000)
    tone: str = Field("professional", max_length=20)  # professional, luxury, casual, investor


class ListingResponse(BaseModel):
    description: str
    headline: str


class CompData(BaseModel):
    address: str = Field(..., max_length=500)
    sale_price: int
    sqft: Optional[int] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    sale_date: Optional[str] = Field(None, max_length=20)
    notes: Optional[str] = Field(None, max_length=2000)


class CompAnalysisRequest(BaseModel):
    subject_address: str = Field(..., max_length=500)
    subject_sqft: Optional[int] = None
    subject_bedrooms: Optional[int] = None
    subject_bathrooms: Optional[float] = None
    subject_lot_acres: Optional[float] = None
    subject_year_built: Optional[int] = None
    subject_features: Optional[BoundedJSONDict] = None
    comps: list[CompData] = Field(..., max_length=50)


class CompAnalysisResponse(BaseModel):
    suggested_price: int
    price_range_low: int
    price_range_high: int
    analysis: str


class CommDraftRequest(BaseModel):
    recipient_name: str = Field(..., max_length=200)
    purpose: str = Field(..., max_length=50)  # initial_outreach, follow_up, etc.
    context: Optional[str] = Field(None, max_length=10000)
    tone: str = Field("professional", max_length=20)
    medium: str = Field("email", max_length=20)


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

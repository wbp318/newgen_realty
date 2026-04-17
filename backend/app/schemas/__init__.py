from app.schemas.property import PropertyCreate, PropertyUpdate, PropertyResponse
from app.schemas.contact import ContactCreate, ContactUpdate, ContactResponse
from app.schemas.ai import (
    ChatRequest, ChatResponse,
    ListingRequest, ListingResponse,
    CompAnalysisRequest, CompAnalysisResponse,
    CommDraftRequest, CommDraftResponse,
)
from app.schemas.prospect import (
    ProspectCreate, ProspectUpdate, ProspectResponse,
    ProspectGeoPoint,
    ProspectSearchRequest, ProspectSearchResponse,
    ProspectScoreRequest, ProspectScoreResponse,
    BulkScoreRequest, BulkScoreResponse,
    ProspectListCreate, ProspectListUpdate, ProspectListResponse,
)
from app.schemas.outreach import (
    OutreachCampaignCreate, OutreachCampaignUpdate, OutreachCampaignResponse,
    OutreachMessageResponse,
    GenerateMessageRequest, GenerateMessageResponse,
    CampaignInsightsResponse,
)

__all__ = [
    "PropertyCreate", "PropertyUpdate", "PropertyResponse",
    "ContactCreate", "ContactUpdate", "ContactResponse",
    "ChatRequest", "ChatResponse",
    "ListingRequest", "ListingResponse",
    "CompAnalysisRequest", "CompAnalysisResponse",
    "CommDraftRequest", "CommDraftResponse",
    "ProspectCreate", "ProspectUpdate", "ProspectResponse",
    "ProspectGeoPoint",
    "ProspectSearchRequest", "ProspectSearchResponse",
    "ProspectScoreRequest", "ProspectScoreResponse",
    "BulkScoreRequest", "BulkScoreResponse",
    "ProspectListCreate", "ProspectListUpdate", "ProspectListResponse",
    "OutreachCampaignCreate", "OutreachCampaignUpdate", "OutreachCampaignResponse",
    "OutreachMessageResponse",
    "GenerateMessageRequest", "GenerateMessageResponse",
    "CampaignInsightsResponse",
]

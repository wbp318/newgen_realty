from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ProspectCreate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    mailing_address: Optional[str] = None
    property_address: str
    property_city: Optional[str] = None
    property_parish: Optional[str] = None
    property_state: str = "LA"
    property_zip: Optional[str] = None
    prospect_type: str
    status: str = "new"
    motivation_signals: Optional[dict] = None
    property_data: Optional[dict] = None
    data_source: str = "manual"
    source_record_id: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[list[str]] = None


class ProspectUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    mailing_address: Optional[str] = None
    property_address: Optional[str] = None
    property_city: Optional[str] = None
    property_parish: Optional[str] = None
    property_state: Optional[str] = None
    property_zip: Optional[str] = None
    prospect_type: Optional[str] = None
    status: Optional[str] = None
    motivation_signals: Optional[dict] = None
    property_data: Optional[dict] = None
    consent_status: Optional[str] = None
    consent_method: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[list[str]] = None


class ProspectResponse(BaseModel):
    id: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    mailing_address: Optional[str] = None
    property_address: str
    property_city: Optional[str] = None
    property_parish: Optional[str] = None
    property_state: str
    property_zip: Optional[str] = None
    prospect_type: str
    status: str
    motivation_signals: Optional[dict] = None
    property_data: Optional[dict] = None
    ai_prospect_score: Optional[float] = None
    ai_prospect_score_reason: Optional[str] = None
    ai_scored_at: Optional[datetime] = None
    consent_status: str
    consent_date: Optional[datetime] = None
    consent_method: Optional[str] = None
    dnc_checked: bool
    dnc_checked_at: Optional[datetime] = None
    dnc_listed: bool
    opt_out_date: Optional[datetime] = None
    opt_out_processed: bool
    contact_window_timezone: Optional[str] = None
    property_latitude: Optional[float] = None
    property_longitude: Optional[float] = None
    geocoded_at: Optional[datetime] = None
    contact_id: Optional[str] = None
    data_source: str
    source_record_id: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[list[str]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProspectGeoPoint(BaseModel):
    id: str
    latitude: float
    longitude: float
    property_address: str
    property_city: Optional[str] = None
    property_state: Optional[str] = None
    property_parish: Optional[str] = None
    prospect_type: str
    status: str
    ai_prospect_score: Optional[float] = None


class ProspectSearchRequest(BaseModel):
    search_type: str
    state: str = "LA"
    parish: Optional[str] = None
    city: Optional[str] = None
    zip_code: Optional[str] = None
    min_equity_pct: Optional[int] = None
    min_ownership_years: Optional[int] = None
    max_results: int = 50


class ProspectSearchResponse(BaseModel):
    prospects: list[ProspectResponse]
    total_found: int
    imported_count: int
    skipped_count: int
    search_criteria: dict
    source: str = "attom"


class ProspectScoreRequest(BaseModel):
    prospect_id: str


class ProspectScoreResponse(BaseModel):
    prospect_id: str
    score: float
    reason: str
    motivation_level: str
    suggested_approach: Optional[str] = None
    suggested_outreach_type: Optional[str] = None


class BulkScoreRequest(BaseModel):
    prospect_ids: list[str] = Field(..., max_length=50)


class BulkScoreResponse(BaseModel):
    results: list[ProspectScoreResponse]
    average_score: float


# Prospect Lists

class ProspectListCreate(BaseModel):
    name: str
    description: Optional[str] = None
    search_criteria: Optional[dict] = None
    prospect_ids: Optional[list[str]] = None


class ProspectListUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    prospect_ids: Optional[list[str]] = None


class ProspectListResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    search_criteria: Optional[dict] = None
    prospect_count: int
    prospect_ids: Optional[list[str]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

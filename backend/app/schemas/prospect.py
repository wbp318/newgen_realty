from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.schemas._validators import BoundedJSONDict


class ProspectCreate(BaseModel):
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=30)
    mailing_address: Optional[str] = Field(None, max_length=500)
    property_address: str = Field(..., max_length=500)
    property_city: Optional[str] = Field(None, max_length=100)
    property_parish: Optional[str] = Field(None, max_length=100)
    property_state: str = Field("LA", max_length=2)
    property_zip: Optional[str] = Field(None, max_length=10)
    prospect_type: str = Field(..., max_length=30)
    status: str = Field("new", max_length=20)
    motivation_signals: Optional[BoundedJSONDict] = None
    property_data: Optional[BoundedJSONDict] = None
    data_source: str = Field("manual", max_length=50)
    source_record_id: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = Field(None, max_length=10000)
    tags: Optional[list[str]] = Field(None, max_length=20)


class ProspectUpdate(BaseModel):
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=30)
    mailing_address: Optional[str] = Field(None, max_length=500)
    property_address: Optional[str] = Field(None, max_length=500)
    property_city: Optional[str] = Field(None, max_length=100)
    property_parish: Optional[str] = Field(None, max_length=100)
    property_state: Optional[str] = Field(None, max_length=2)
    property_zip: Optional[str] = Field(None, max_length=10)
    prospect_type: Optional[str] = Field(None, max_length=30)
    status: Optional[str] = Field(None, max_length=20)
    motivation_signals: Optional[BoundedJSONDict] = None
    property_data: Optional[BoundedJSONDict] = None
    consent_status: Optional[str] = Field(None, max_length=20)
    consent_method: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = Field(None, max_length=10000)
    tags: Optional[list[str]] = Field(None, max_length=20)


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
    search_type: str = Field(..., max_length=30)
    state: str = Field("LA", max_length=2)
    parish: Optional[str] = Field(None, max_length=100)
    city: Optional[str] = Field(None, max_length=100)
    zip_code: Optional[str] = Field(None, max_length=10)
    min_equity_pct: Optional[int] = Field(None, ge=0, le=100)
    min_ownership_years: Optional[int] = Field(None, ge=0, le=200)
    max_results: int = Field(50, ge=1, le=200)


class ProspectSearchResponse(BaseModel):
    prospects: list[ProspectResponse]
    total_found: int
    imported_count: int
    skipped_count: int
    search_criteria: dict
    source: str = "attom"


class ProspectScoreRequest(BaseModel):
    prospect_id: str = Field(..., max_length=36)


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
    name: str = Field(..., max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    search_criteria: Optional[BoundedJSONDict] = None
    prospect_ids: Optional[list[str]] = Field(None, max_length=10000)


class ProspectListUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    prospect_ids: Optional[list[str]] = Field(None, max_length=10000)


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

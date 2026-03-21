from typing import Optional

from pydantic import BaseModel


class MarketCompRequest(BaseModel):
    address: str
    sqft: Optional[int] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    comp_count: int = 10


class MarketComp(BaseModel):
    address: str
    city: str
    state: str
    zip_code: str
    sale_price: int
    sqft: Optional[int] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    lot_size_acres: Optional[float] = None
    year_built: Optional[int] = None
    sale_date: Optional[str] = None
    distance_miles: Optional[float] = None
    property_type: Optional[str] = None


class MarketCompResponse(BaseModel):
    subject_address: str
    comps: list[MarketComp]
    source: str = "realty_mole"


class PropertyLookupRequest(BaseModel):
    address: str


class PropertyRecord(BaseModel):
    address: str
    city: str
    county: Optional[str] = None
    state: str
    zip_code: str
    sqft: Optional[int] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    lot_size_acres: Optional[float] = None
    year_built: Optional[int] = None
    property_type: Optional[str] = None
    last_sale_price: Optional[int] = None
    last_sale_date: Optional[str] = None
    assessed_value: Optional[int] = None
    tax_amount: Optional[float] = None


class PropertyLookupResponse(BaseModel):
    records: list[PropertyRecord]
    source: str = "realty_mole"


class AutoCompAnalysisRequest(BaseModel):
    """Request to auto-fetch comps from market data and run AI analysis for a property."""
    property_id: str
    comp_count: int = 10

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class PropertyCreate(BaseModel):
    street_address: str
    city: str
    parish: str
    state: str = "LA"
    zip_code: str
    property_type: str
    status: str = "draft"
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    sqft: Optional[int] = None
    lot_size_acres: Optional[float] = None
    year_built: Optional[int] = None
    asking_price: Optional[int] = None
    features: Optional[dict] = None
    photos: Optional[list[str]] = None
    mls_number: Optional[str] = None
    notes: Optional[str] = None


class PropertyUpdate(BaseModel):
    street_address: Optional[str] = None
    city: Optional[str] = None
    parish: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    property_type: Optional[str] = None
    status: Optional[str] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    sqft: Optional[int] = None
    lot_size_acres: Optional[float] = None
    year_built: Optional[int] = None
    asking_price: Optional[int] = None
    features: Optional[dict] = None
    photos: Optional[list[str]] = None
    mls_number: Optional[str] = None
    notes: Optional[str] = None


class PropertyResponse(BaseModel):
    id: str
    street_address: str
    city: str
    parish: str
    state: str
    zip_code: str
    property_type: str
    status: str
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    sqft: Optional[int] = None
    lot_size_acres: Optional[float] = None
    year_built: Optional[int] = None
    asking_price: Optional[int] = None
    ai_suggested_price: Optional[int] = None
    ai_description: Optional[str] = None
    ai_description_generated_at: Optional[datetime] = None
    features: Optional[dict] = None
    photos: Optional[list[str]] = None
    mls_number: Optional[str] = None
    notes: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    geocoded_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

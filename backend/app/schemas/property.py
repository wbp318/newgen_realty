from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.schemas._validators import BoundedJSONDict


class PropertyCreate(BaseModel):
    street_address: str = Field(..., max_length=500)
    city: str = Field(..., max_length=100)
    parish: str = Field(..., max_length=100)
    state: str = Field("LA", max_length=2)
    zip_code: str = Field(..., max_length=10)
    property_type: str = Field(..., max_length=20)
    status: str = Field("draft", max_length=20)
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    sqft: Optional[int] = None
    lot_size_acres: Optional[float] = None
    year_built: Optional[int] = None
    asking_price: Optional[int] = None
    features: Optional[BoundedJSONDict] = None
    photos: Optional[list[str]] = Field(None, max_length=50)
    mls_number: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = Field(None, max_length=10000)


class PropertyUpdate(BaseModel):
    street_address: Optional[str] = Field(None, max_length=500)
    city: Optional[str] = Field(None, max_length=100)
    parish: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=2)
    zip_code: Optional[str] = Field(None, max_length=10)
    property_type: Optional[str] = Field(None, max_length=20)
    status: Optional[str] = Field(None, max_length=20)
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    sqft: Optional[int] = None
    lot_size_acres: Optional[float] = None
    year_built: Optional[int] = None
    asking_price: Optional[int] = None
    features: Optional[BoundedJSONDict] = None
    photos: Optional[list[str]] = Field(None, max_length=50)
    mls_number: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = Field(None, max_length=10000)


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


class PropertyGeoPoint(BaseModel):
    id: str
    latitude: float
    longitude: float
    street_address: str
    city: Optional[str] = None
    state: Optional[str] = None
    parish: Optional[str] = None
    property_type: str
    status: str
    asking_price: Optional[int] = None

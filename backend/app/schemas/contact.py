from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ContactCreate(BaseModel):
    first_name: str = Field(..., max_length=100)
    last_name: str = Field(..., max_length=100)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=30)
    contact_type: str = Field("lead", max_length=20)
    preferred_parishes: Optional[list[str]] = Field(None, max_length=64)
    budget_min: Optional[int] = None
    budget_max: Optional[int] = None
    preferred_property_types: Optional[list[str]] = Field(None, max_length=20)
    preferred_cities: Optional[list[str]] = Field(None, max_length=64)
    source: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = Field(None, max_length=5000)


class ContactUpdate(BaseModel):
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=30)
    contact_type: Optional[str] = Field(None, max_length=20)
    preferred_parishes: Optional[list[str]] = Field(None, max_length=64)
    budget_min: Optional[int] = None
    budget_max: Optional[int] = None
    preferred_property_types: Optional[list[str]] = Field(None, max_length=20)
    preferred_cities: Optional[list[str]] = Field(None, max_length=64)
    source: Optional[str] = Field(None, max_length=100)
    last_contact_date: Optional[datetime] = None
    ai_lead_score: Optional[float] = None
    ai_lead_score_reason: Optional[str] = Field(None, max_length=2000)
    notes: Optional[str] = Field(None, max_length=5000)


class ContactResponse(BaseModel):
    id: str
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    contact_type: str
    preferred_parishes: Optional[list[str]] = None
    budget_min: Optional[int] = None
    budget_max: Optional[int] = None
    preferred_property_types: Optional[list[str]] = None
    preferred_cities: Optional[list[str]] = None
    source: Optional[str] = None
    last_contact_date: Optional[datetime] = None
    ai_lead_score: Optional[float] = None
    ai_lead_score_reason: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ContactCreate(BaseModel):
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    contact_type: str = "lead"
    preferred_parishes: Optional[list[str]] = None
    budget_min: Optional[int] = None
    budget_max: Optional[int] = None
    notes: Optional[str] = None


class ContactUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    contact_type: Optional[str] = None
    preferred_parishes: Optional[list[str]] = None
    budget_min: Optional[int] = None
    budget_max: Optional[int] = None
    notes: Optional[str] = None


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
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

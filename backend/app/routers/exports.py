"""CSV export endpoints — prospects / contacts / activities.

Streams text/csv via stdlib `csv` + `StreamingResponse`. No third-party
deps. Filters mirror the corresponding list endpoints so the agent can
export exactly what they're looking at.
"""

import csv
import io
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.activity import Activity
from app.models.contact import Contact
from app.models.prospect import Prospect


router = APIRouter(prefix="/api/exports", tags=["exports"])


def _csv_response(rows: list[list], headers: list[str], filename: str) -> StreamingResponse:
    """Build a streaming text/csv response. Writes UTF-8 with BOM so
    Excel opens with proper character display on Windows."""
    buf = io.StringIO()
    buf.write("﻿")  # BOM for Excel
    writer = csv.writer(buf)
    writer.writerow(headers)
    writer.writerows(rows)
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


def _today_stamp() -> str:
    return datetime.now().strftime("%Y%m%d")


@router.get("/prospects")
async def export_prospects(
    state: Optional[str] = Query(None, max_length=2),
    parish: Optional[str] = Query(None, max_length=100),
    status: Optional[str] = Query(None, max_length=20),
    prospect_type: Optional[str] = Query(None, max_length=30),
    min_score: Optional[float] = Query(None, ge=0, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Export prospects to CSV. Filters mirror the list endpoint."""
    query = select(Prospect).order_by(Prospect.created_at.desc())
    if state:
        query = query.where(Prospect.property_state == state)
    if parish:
        query = query.where(Prospect.property_parish.ilike(f"%{parish}%"))
    if status:
        query = query.where(Prospect.status == status)
    if prospect_type:
        query = query.where(Prospect.prospect_type == prospect_type)
    if min_score is not None:
        query = query.where(Prospect.ai_prospect_score >= min_score)

    rows = (await db.execute(query)).scalars().all()
    headers = [
        "id", "first_name", "last_name", "email", "phone",
        "property_address", "property_city", "property_parish", "property_state", "property_zip",
        "prospect_type", "status", "ai_prospect_score", "ai_prospect_score_reason",
        "consent_status", "dnc_listed", "data_source", "tags",
        "created_at", "updated_at",
    ]
    data = [
        [
            r.id, r.first_name or "", r.last_name or "", r.email or "", r.phone or "",
            r.property_address, r.property_city or "", r.property_parish or "",
            r.property_state, r.property_zip or "",
            r.prospect_type, r.status,
            r.ai_prospect_score if r.ai_prospect_score is not None else "",
            (r.ai_prospect_score_reason or "").replace("\n", " ").replace("\r", " "),
            r.consent_status, r.dnc_listed, r.data_source,
            ",".join(r.tags or []),
            r.created_at.isoformat() if r.created_at else "",
            r.updated_at.isoformat() if r.updated_at else "",
        ]
        for r in rows
    ]
    return _csv_response(data, headers, f"prospects_{_today_stamp()}.csv")


@router.get("/contacts")
async def export_contacts(
    contact_type: Optional[str] = Query(None, max_length=20),
    db: AsyncSession = Depends(get_db),
):
    """Export contacts to CSV."""
    query = select(Contact).order_by(Contact.created_at.desc())
    if contact_type:
        query = query.where(Contact.contact_type == contact_type)

    rows = (await db.execute(query)).scalars().all()
    headers = [
        "id", "first_name", "last_name", "email", "phone", "contact_type",
        "preferred_parishes", "preferred_cities", "preferred_property_types",
        "budget_min", "budget_max",
        "ai_lead_score", "ai_lead_score_reason",
        "source", "last_contact_date", "created_at", "updated_at",
    ]
    data = [
        [
            r.id, r.first_name, r.last_name, r.email or "", r.phone or "",
            r.contact_type,
            ",".join(r.preferred_parishes or []),
            ",".join(r.preferred_cities or []),
            ",".join(r.preferred_property_types or []),
            r.budget_min if r.budget_min is not None else "",
            r.budget_max if r.budget_max is not None else "",
            r.ai_lead_score if r.ai_lead_score is not None else "",
            (r.ai_lead_score_reason or "").replace("\n", " ").replace("\r", " "),
            r.source or "",
            r.last_contact_date.isoformat() if r.last_contact_date else "",
            r.created_at.isoformat() if r.created_at else "",
            r.updated_at.isoformat() if r.updated_at else "",
        ]
        for r in rows
    ]
    return _csv_response(data, headers, f"contacts_{_today_stamp()}.csv")


@router.get("/activities")
async def export_activities(
    activity_type: Optional[str] = Query(None, max_length=30),
    contact_id: Optional[str] = Query(None, max_length=36),
    property_id: Optional[str] = Query(None, max_length=36),
    prospect_id: Optional[str] = Query(None, max_length=36),
    db: AsyncSession = Depends(get_db),
):
    """Export activities to CSV."""
    query = select(Activity).order_by(Activity.created_at.desc())
    if activity_type:
        query = query.where(Activity.activity_type == activity_type)
    if contact_id:
        query = query.where(Activity.contact_id == contact_id)
    if property_id:
        query = query.where(Activity.property_id == property_id)
    if prospect_id:
        query = query.where(Activity.prospect_id == prospect_id)

    rows = (await db.execute(query)).scalars().all()
    headers = [
        "id", "activity_type", "title", "description",
        "contact_id", "property_id", "prospect_id",
        "created_at",
    ]
    data = [
        [
            r.id, r.activity_type, r.title,
            (r.description or "").replace("\n", " ").replace("\r", " "),
            r.contact_id or "", r.property_id or "", r.prospect_id or "",
            r.created_at.isoformat() if r.created_at else "",
        ]
        for r in rows
    ]
    return _csv_response(data, headers, f"activities_{_today_stamp()}.csv")

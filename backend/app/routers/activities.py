from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from datetime import datetime, timezone

from app.database import get_db
from app.models.activity import Activity
from app.models.contact import Contact
from app.schemas.activity import ActivityCreate, ActivityResponse

router = APIRouter(prefix="/api/activities", tags=["activities"])


@router.get("", response_model=list[ActivityResponse])
async def list_activities(
    contact_id: Optional[str] = Query(None),
    property_id: Optional[str] = Query(None),
    prospect_id: Optional[str] = Query(None),
    activity_type: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
):
    query = select(Activity).order_by(Activity.created_at.desc())
    if contact_id:
        query = query.where(Activity.contact_id == contact_id)
    if property_id:
        query = query.where(Activity.property_id == property_id)
    if prospect_id:
        query = query.where(Activity.prospect_id == prospect_id)
    if activity_type:
        query = query.where(Activity.activity_type == activity_type)
    query = query.limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=ActivityResponse, status_code=201)
async def create_activity(data: ActivityCreate, db: AsyncSession = Depends(get_db)):
    activity = Activity(**data.model_dump(exclude_none=True))
    db.add(activity)
    await db.commit()
    await db.refresh(activity)

    # Update last_contact_date on the linked contact
    if data.contact_id:
        result = await db.execute(select(Contact).where(Contact.id == data.contact_id))
        contact = result.scalar_one_or_none()
        if contact:
            contact.last_contact_date = datetime.now(timezone.utc)
            await db.commit()

    return activity


@router.get("/{activity_id}", response_model=ActivityResponse)
async def get_activity(activity_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Activity).where(Activity.id == activity_id))
    activity = result.scalar_one_or_none()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    return activity


@router.delete("/{activity_id}", status_code=204)
async def delete_activity(activity_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Activity).where(Activity.id == activity_id))
    activity = result.scalar_one_or_none()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    await db.delete(activity)
    await db.commit()

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.activity import Activity
from app.models.property import Property
from app.schemas.property import PropertyCreate, PropertyResponse, PropertyUpdate

router = APIRouter(prefix="/api/properties", tags=["properties"])


@router.get("", response_model=list[PropertyResponse])
async def list_properties(
    parish: Optional[str] = Query(None, max_length=100),
    state: Optional[str] = Query(None, max_length=2),
    status: Optional[str] = Query(None, max_length=20),
    property_type: Optional[str] = Query(None, max_length=20),
    min_price: Optional[int] = Query(None),
    max_price: Optional[int] = Query(None),
    bedrooms: Optional[int] = Query(None),
    city: Optional[str] = Query(None, max_length=100),
    q: Optional[str] = Query(None, max_length=100, description="Text search across address and city"),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    query = select(Property).order_by(Property.created_at.desc())
    if state:
        query = query.where(Property.state == state)
    if parish:
        query = query.where(Property.parish.ilike(f"%{parish}%"))
    if status:
        query = query.where(Property.status == status)
    if property_type:
        query = query.where(Property.property_type == property_type)
    if min_price is not None:
        query = query.where(Property.asking_price >= min_price)
    if max_price is not None:
        query = query.where(Property.asking_price <= max_price)
    if bedrooms is not None:
        query = query.where(Property.bedrooms >= bedrooms)
    if city:
        query = query.where(Property.city.ilike(f"%{city}%"))
    if q:
        query = query.where(
            or_(
                Property.street_address.ilike(f"%{q}%"),
                Property.city.ilike(f"%{q}%"),
                Property.parish.ilike(f"%{q}%"),
            )
        )
    query = query.limit(limit).offset(offset)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=PropertyResponse, status_code=201)
async def create_property(data: PropertyCreate, db: AsyncSession = Depends(get_db)):
    prop = Property(**data.model_dump(exclude_none=True))
    db.add(prop)
    await db.commit()
    await db.refresh(prop)
    return prop


@router.get("/{property_id}", response_model=PropertyResponse)
async def get_property(property_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Property).where(Property.id == property_id))
    prop = result.scalar_one_or_none()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    return prop


@router.put("/{property_id}", response_model=PropertyResponse)
async def update_property(property_id: str, data: PropertyUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Property).where(Property.id == property_id))
    prop = result.scalar_one_or_none()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    updated_fields = data.model_dump(exclude_none=True)
    for key, value in updated_fields.items():
        setattr(prop, key, value)
    await db.commit()
    await db.refresh(prop)

    # Log activity for the update
    if updated_fields:
        field_names = ", ".join(updated_fields.keys())
        activity = Activity(
            activity_type="note",
            title=f"Property updated: {field_names}",
            property_id=property_id,
        )
        db.add(activity)
        await db.commit()

    return prop


@router.delete("/{property_id}", status_code=204)
async def delete_property(property_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Property).where(Property.id == property_id))
    prop = result.scalar_one_or_none()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    await db.delete(prop)
    await db.commit()

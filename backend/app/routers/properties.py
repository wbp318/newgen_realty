from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.activity import Activity
from app.models.property import Property
from app.schemas.property import (
    PropertyCreate,
    PropertyGeoPoint,
    PropertyResponse,
    PropertyUpdate,
)
from app.services import geocoder
from app.services.rate_limit import rate_limit


# 100 GET /api/properties per minute per IP — pentest target
_general_rate_limit = rate_limit("properties.list", limit=100, window_seconds=60)


def _apply_geocode(prop: Property) -> None:
    """Best-effort geocoding — mutates property in place, silently no-ops on fail."""
    result = geocoder.geocode(
        prop.street_address,
        prop.city,
        prop.state,
        prop.zip_code,
    )
    if result:
        prop.latitude = result["latitude"]
        prop.longitude = result["longitude"]
        prop.geocoded_at = datetime.utcnow()


router = APIRouter(prefix="/api/properties", tags=["properties"])


@router.get("", response_model=list[PropertyResponse], dependencies=[Depends(_general_rate_limit)])
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
    _apply_geocode(prop)
    db.add(prop)
    await db.commit()
    await db.refresh(prop)
    return prop


@router.get("/geo", response_model=list[PropertyGeoPoint])
async def get_property_geo(
    min_lat: Optional[float] = Query(None, ge=-90, le=90),
    max_lat: Optional[float] = Query(None, ge=-90, le=90),
    min_lng: Optional[float] = Query(None, ge=-180, le=180),
    max_lng: Optional[float] = Query(None, ge=-180, le=180),
    state: Optional[str] = Query(None, max_length=2),
    parish: Optional[str] = Query(None, max_length=100),
    status: Optional[str] = Query(None, max_length=20),
    types: Optional[str] = Query(None, max_length=100, description="Comma-separated property types"),
    limit: int = Query(2000, le=5000),
    db: AsyncSession = Depends(get_db),
):
    """Lightweight geo points for map rendering. Excludes properties without coordinates."""
    query = select(
        Property.id,
        Property.latitude,
        Property.longitude,
        Property.street_address,
        Property.city,
        Property.state,
        Property.parish,
        Property.property_type,
        Property.status,
        Property.asking_price,
    ).where(
        Property.latitude.isnot(None),
        Property.longitude.isnot(None),
    )
    if min_lat is not None:
        query = query.where(Property.latitude >= min_lat)
    if max_lat is not None:
        query = query.where(Property.latitude <= max_lat)
    if min_lng is not None:
        query = query.where(Property.longitude >= min_lng)
    if max_lng is not None:
        query = query.where(Property.longitude <= max_lng)
    if state:
        query = query.where(Property.state == state)
    if parish:
        query = query.where(Property.parish == parish)
    if status:
        query = query.where(Property.status == status)
    if types:
        type_list = [t.strip() for t in types.split(",") if t.strip()][:10]
        if type_list:
            query = query.where(Property.property_type.in_(type_list))
    query = query.limit(limit)
    rows = (await db.execute(query)).all()
    return [
        PropertyGeoPoint(
            id=r.id,
            latitude=r.latitude,
            longitude=r.longitude,
            street_address=r.street_address,
            city=r.city,
            state=r.state,
            parish=r.parish,
            property_type=r.property_type,
            status=r.status,
            asking_price=r.asking_price,
        )
        for r in rows
    ]


@router.post("/geocode-backfill")
async def geocode_backfill(
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
):
    """Fill in latitude/longitude on properties that are missing it.

    Respects Nominatim's 1 req/sec limit via the geocoder service, so ~50 properties
    takes ~55s. Use small batches.
    """
    missing = (
        await db.execute(
            select(Property)
            .where(Property.latitude.is_(None))
            .where(Property.street_address.isnot(None))
            .limit(limit)
        )
    ).scalars().all()

    updated = 0
    failed = 0
    for prop in missing:
        result = geocoder.geocode(
            prop.street_address,
            prop.city,
            prop.state,
            prop.zip_code,
        )
        if result:
            prop.latitude = result["latitude"]
            prop.longitude = result["longitude"]
            prop.geocoded_at = datetime.utcnow()
            updated += 1
        else:
            failed += 1

    if updated:
        await db.commit()

    return {
        "scanned": len(missing),
        "updated": updated,
        "failed": failed,
    }


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
    # Re-geocode if any address component changed
    if any(k in updated_fields for k in ("street_address", "city", "state", "zip_code")):
        _apply_geocode(prop)
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

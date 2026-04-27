import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import Field
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.activity import Activity
from app.models.contact import Contact
from app.models.prospect import Prospect
from app.models.prospect_list import ProspectList
from app.schemas.contact import ContactResponse
from app.schemas.prospect import (
    ProspectCreate,
    ProspectGeoPoint,
    ProspectListCreate,
    ProspectListResponse,
    ProspectListUpdate,
    ProspectResponse,
    ProspectSearchRequest,
    ProspectSearchResponse,
    ProspectUpdate,
)
from app.services import prospect_data
from app.services import skip_trace as skip_trace_service
from app.services import county_data
from app.services import geocoder
from app.services.compliance import validate_outreach_compliance
from app.services.rate_limit import rate_limit


# Hourly cap on ATTOM search (expensive paid endpoint).
_search_rate_limit = rate_limit("prospects.search", limit=10, window_seconds=3600)
# Per-minute cap on single-prospect skip trace.
_skip_trace_rate_limit = rate_limit("prospects.skip_trace", limit=5, window_seconds=60)
# Mutating endpoints trigger a Nominatim geocode behind the 1.1s global
# lock — bursts saturate the threadpool. Match properties' limits.
_create_rate_limit = rate_limit("prospects.create", limit=60, window_seconds=60)
_backfill_rate_limit = rate_limit("prospects.geocode_backfill", limit=5, window_seconds=300)

logger = logging.getLogger(__name__)


def _apply_geocode(prospect: Prospect) -> None:
    """Best-effort geocoding — mutates prospect in place, silently no-ops on fail."""
    result = geocoder.geocode(
        prospect.property_address,
        prospect.property_city,
        prospect.property_state,
        prospect.property_zip,
    )
    if result:
        prospect.property_latitude = result["latitude"]
        prospect.property_longitude = result["longitude"]
        prospect.geocoded_at = datetime.utcnow()

router = APIRouter(prefix="/api/prospects", tags=["prospects"])


# ---------------------------------------------------------------------------
# ATTOM status
# ---------------------------------------------------------------------------

@router.get("/status")
def attom_status():
    """Check if ATTOM Data API is configured."""
    return {"configured": prospect_data.is_configured()}


# ---------------------------------------------------------------------------
# Prospect Lists (must be before /{prospect_id} to avoid route conflicts)
# ---------------------------------------------------------------------------

@router.get("/lists", response_model=list[ProspectListResponse])
async def list_prospect_lists(
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(ProspectList)
        .order_by(ProspectList.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/lists", response_model=ProspectListResponse, status_code=201)
async def create_prospect_list(
    data: ProspectListCreate,
    db: AsyncSession = Depends(get_db),
):
    pl = ProspectList(
        name=data.name,
        description=data.description,
        search_criteria=data.search_criteria or {},
        prospect_ids=data.prospect_ids or [],
        prospect_count=len(data.prospect_ids) if data.prospect_ids else 0,
    )
    db.add(pl)
    await db.commit()
    await db.refresh(pl)
    return pl


@router.get("/lists/{list_id}", response_model=ProspectListResponse)
async def get_prospect_list(list_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ProspectList).where(ProspectList.id == list_id))
    pl = result.scalar_one_or_none()
    if not pl:
        raise HTTPException(status_code=404, detail="Prospect list not found")
    return pl


@router.put("/lists/{list_id}", response_model=ProspectListResponse)
async def update_prospect_list(
    list_id: str,
    data: ProspectListUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ProspectList).where(ProspectList.id == list_id))
    pl = result.scalar_one_or_none()
    if not pl:
        raise HTTPException(status_code=404, detail="Prospect list not found")
    updated = data.model_dump(exclude_none=True)
    for key, value in updated.items():
        setattr(pl, key, value)
    if "prospect_ids" in updated:
        pl.prospect_count = len(pl.prospect_ids) if pl.prospect_ids else 0
    await db.commit()
    await db.refresh(pl)
    return pl


# ---------------------------------------------------------------------------
# Search — import from ATTOM
# ---------------------------------------------------------------------------

@router.post("/search", response_model=ProspectSearchResponse, dependencies=[Depends(_search_rate_limit)])
async def search_prospects(
    request: ProspectSearchRequest,
    db: AsyncSession = Depends(get_db),
):
    """Search ATTOM for new prospects and import them."""
    if not prospect_data.is_configured():
        raise HTTPException(status_code=503, detail="ATTOM_API_KEY not configured")

    search_type = request.search_type
    kwargs = {
        "state": request.state,
        "county": request.parish,
        "zip_code": request.zip_code,
        "max_results": request.max_results,
    }
    # Remove None values
    kwargs = {k: v for k, v in kwargs.items() if v is not None}

    # Add type-specific params
    if search_type == "long_term_owner" and request.min_ownership_years:
        kwargs["min_years"] = request.min_ownership_years

    # Add city if provided
    if request.city:
        kwargs["city"] = request.city

    # Dispatch to the right search function
    search_funcs = {
        "absentee_owner": prospect_data.search_absentee_owners,
        "pre_foreclosure": prospect_data.search_pre_foreclosures,
        "long_term_owner": prospect_data.search_long_term_owners,
        "tax_delinquent": prospect_data.search_tax_delinquent,
        "vacant": prospect_data.search_vacant_properties,
    }

    func = search_funcs.get(search_type)
    if not func:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported search type: {search_type}. "
            f"Supported: {', '.join(search_funcs.keys())}",
        )

    try:
        raw_prospects = func(**kwargs)
    except Exception as e:
        raise HTTPException(status_code=502, detail="ATTOM API error. Please try again later.")

    # Deduplicate — skip prospects whose property_address already exists
    existing_result = await db.execute(
        select(Prospect.property_address).where(
            Prospect.property_state == request.state
        )
    )
    existing_addresses = {row[0] for row in existing_result.all()}

    imported = []
    skipped = 0
    for raw in raw_prospects:
        if raw["property_address"] in existing_addresses:
            skipped += 1
            continue

        prospect = Prospect(**raw)
        _apply_geocode(prospect)
        db.add(prospect)
        imported.append(prospect)
        existing_addresses.add(raw["property_address"])

    if imported:
        await db.commit()
        for p in imported:
            await db.refresh(p)

    # Log the search as an activity
    activity = Activity(
        activity_type="ai_action",
        title=f"Prospect search: {search_type} in {request.state}",
        description=f"Found {len(raw_prospects)}, imported {len(imported)}, skipped {skipped} duplicates",
        extra_data={
            "search_type": search_type,
            "state": request.state,
            "parish": request.parish,
        },
    )
    db.add(activity)
    await db.commit()

    return ProspectSearchResponse(
        prospects=imported,
        total_found=len(raw_prospects),
        imported_count=len(imported),
        skipped_count=skipped,
        search_criteria=request.model_dump(),
        source="attom",
    )


# ---------------------------------------------------------------------------
# Prospect CRUD
# ---------------------------------------------------------------------------

@router.get("", response_model=list[ProspectResponse])
async def list_prospects(
    prospect_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    parish: Optional[str] = Query(None),
    min_score: Optional[float] = Query(None),
    max_score: Optional[float] = Query(None),
    consent_status: Optional[str] = Query(None),
    data_source: Optional[str] = Query(None),
    q: Optional[str] = Query(None, max_length=100, description="Text search across name, address"),
    sort_by: Optional[str] = Query("created_at", description="Sort: created_at, score"),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    if sort_by == "score":
        query = select(Prospect).order_by(Prospect.ai_prospect_score.desc().nullslast())
    else:
        query = select(Prospect).order_by(Prospect.created_at.desc())

    if prospect_type:
        query = query.where(Prospect.prospect_type == prospect_type)
    if status:
        query = query.where(Prospect.status == status)
    if state:
        query = query.where(Prospect.property_state == state)
    if parish:
        query = query.where(Prospect.property_parish.ilike(f"%{parish}%"))
    if min_score is not None:
        query = query.where(Prospect.ai_prospect_score >= min_score)
    if max_score is not None:
        query = query.where(Prospect.ai_prospect_score <= max_score)
    if consent_status:
        query = query.where(Prospect.consent_status == consent_status)
    if data_source:
        query = query.where(Prospect.data_source == data_source)
    if q:
        query = query.where(
            or_(
                Prospect.first_name.ilike(f"%{q}%"),
                Prospect.last_name.ilike(f"%{q}%"),
                Prospect.property_address.ilike(f"%{q}%"),
                Prospect.property_city.ilike(f"%{q}%"),
            )
        )
    query = query.limit(limit).offset(offset)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=ProspectResponse, status_code=201, dependencies=[Depends(_create_rate_limit)])
async def create_prospect(data: ProspectCreate, db: AsyncSession = Depends(get_db)):
    prospect = Prospect(**data.model_dump(exclude_none=True))
    _apply_geocode(prospect)
    db.add(prospect)
    await db.commit()
    await db.refresh(prospect)
    return prospect


@router.get("/county-sources")
async def list_county_sources(state: Optional[str] = Query(None, max_length=2)):
    """Public-record portal directory for LA, AR, and MS.

    Returns clickable URLs of parish/county assessor and chancery clerk
    portals so an agent can do free manual lookups. We deliberately don't
    scrape — both ARCountyData (Cloudflare) and the LA Prior Inc URLs
    (dead DNS) blocked us; the directory model is honest and unbreakable.

    Defined ahead of `/{prospect_id}` so FastAPI doesn't treat the literal
    string "county-sources" as a prospect ID.
    """
    portals = county_data.list_portals(state)
    return {"portals": portals, "count": len(portals)}


@router.get("/county-lookup")
async def county_lookup(
    state: str = Query(..., max_length=2),
    county_parish: str = Query(..., max_length=100),
):
    """Return the public-record portal URL for a given LA parish or AR/MS
    county. The agent clicks the URL and does the lookup manually — free,
    no key, no fragile scraping. Returns the most specific assessor portal
    when known, or the state-level umbrella as a fallback.

    Defined ahead of `/{prospect_id}` so FastAPI doesn't treat the literal
    string "county-lookup" as a prospect ID.
    """
    entry = county_data.find_portal(state, county_parish)
    if entry is None:
        return {
            "found": False,
            "state": state.upper(),
            "county_or_parish": county_parish,
            "message": "No portal on file for this jurisdiction. Add it to backend/app/services/county_data.py if you find one.",
        }
    return {"found": True, **entry}


@router.get("/geo", response_model=list[ProspectGeoPoint])
async def get_prospect_geo(
    min_lat: Optional[float] = Query(None, ge=-90, le=90),
    max_lat: Optional[float] = Query(None, ge=-90, le=90),
    min_lng: Optional[float] = Query(None, ge=-180, le=180),
    max_lng: Optional[float] = Query(None, ge=-180, le=180),
    min_score: Optional[float] = Query(None, ge=0, le=100),
    state: Optional[str] = Query(None, max_length=2),
    parish: Optional[str] = Query(None, max_length=100),
    status: Optional[str] = Query(None, max_length=50),
    types: Optional[str] = Query(None, max_length=100, description="Comma-separated prospect types"),
    limit: int = Query(2000, le=5000),
    db: AsyncSession = Depends(get_db),
):
    """Lightweight geo points for map rendering. Excludes prospects without coordinates."""
    query = select(
        Prospect.id,
        Prospect.property_latitude,
        Prospect.property_longitude,
        Prospect.property_address,
        Prospect.property_city,
        Prospect.property_state,
        Prospect.property_parish,
        Prospect.prospect_type,
        Prospect.status,
        Prospect.ai_prospect_score,
    ).where(
        Prospect.property_latitude.isnot(None),
        Prospect.property_longitude.isnot(None),
    )
    if min_lat is not None:
        query = query.where(Prospect.property_latitude >= min_lat)
    if max_lat is not None:
        query = query.where(Prospect.property_latitude <= max_lat)
    if min_lng is not None:
        query = query.where(Prospect.property_longitude >= min_lng)
    if max_lng is not None:
        query = query.where(Prospect.property_longitude <= max_lng)
    if min_score is not None:
        query = query.where(Prospect.ai_prospect_score >= min_score)
    if state:
        query = query.where(Prospect.property_state == state)
    if parish:
        query = query.where(Prospect.property_parish == parish)
    if status:
        query = query.where(Prospect.status == status)
    if types:
        type_list = [t.strip() for t in types.split(",") if t.strip()][:10]
        if type_list:
            query = query.where(Prospect.prospect_type.in_(type_list))
    query = query.limit(limit)
    rows = (await db.execute(query)).all()
    return [
        ProspectGeoPoint(
            id=r.id,
            latitude=r.property_latitude,
            longitude=r.property_longitude,
            property_address=r.property_address,
            property_city=r.property_city,
            property_state=r.property_state,
            property_parish=r.property_parish,
            prospect_type=r.prospect_type,
            status=r.status,
            ai_prospect_score=r.ai_prospect_score,
        )
        for r in rows
    ]


@router.post("/geocode-backfill", dependencies=[Depends(_backfill_rate_limit)])
async def geocode_backfill(
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
):
    """Fill in latitude/longitude on prospects that are missing it.

    Respects Nominatim's 1 req/sec limit via the geocoder service, so ~50 prospects
    takes ~55s. Use small batches.
    """
    missing = (
        await db.execute(
            select(Prospect)
            .where(Prospect.property_latitude.is_(None))
            .where(Prospect.property_address.isnot(None))
            .limit(limit)
        )
    ).scalars().all()

    updated = 0
    failed = 0
    for prospect in missing:
        result = geocoder.geocode(
            prospect.property_address,
            prospect.property_city,
            prospect.property_state,
            prospect.property_zip,
        )
        if result:
            prospect.property_latitude = result["latitude"]
            prospect.property_longitude = result["longitude"]
            prospect.geocoded_at = datetime.utcnow()
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


@router.get("/{prospect_id}", response_model=ProspectResponse)
async def get_prospect(prospect_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Prospect).where(Prospect.id == prospect_id))
    prospect = result.scalar_one_or_none()
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")
    return prospect


@router.put("/{prospect_id}", response_model=ProspectResponse)
async def update_prospect(
    prospect_id: str,
    data: ProspectUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Prospect).where(Prospect.id == prospect_id))
    prospect = result.scalar_one_or_none()
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")
    updated_fields = data.model_dump(exclude_none=True)
    for key, value in updated_fields.items():
        setattr(prospect, key, value)
    await db.commit()
    await db.refresh(prospect)

    if updated_fields:
        field_names = ", ".join(updated_fields.keys())
        activity = Activity(
            activity_type="note",
            title=f"Prospect updated: {field_names}",
            prospect_id=prospect_id,
        )
        db.add(activity)
        await db.commit()

    return prospect


@router.delete("/{prospect_id}", status_code=204)
async def delete_prospect(prospect_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Prospect).where(Prospect.id == prospect_id))
    prospect = result.scalar_one_or_none()
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")
    await db.delete(prospect)
    await db.commit()


# ---------------------------------------------------------------------------
# Enrich — pull more data from ATTOM
# ---------------------------------------------------------------------------

@router.post("/{prospect_id}/enrich", response_model=ProspectResponse)
async def enrich_prospect(prospect_id: str, db: AsyncSession = Depends(get_db)):
    """Pull additional data from ATTOM for this prospect."""
    if not prospect_data.is_configured():
        raise HTTPException(status_code=503, detail="ATTOM_API_KEY not configured")

    result = await db.execute(select(Prospect).where(Prospect.id == prospect_id))
    prospect = result.scalar_one_or_none()
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")

    try:
        enrichment = prospect_data.enrich_property(prospect.property_address)
    except Exception as e:
        raise HTTPException(status_code=502, detail="ATTOM API error. Please try again later.")

    if enrichment.get("property_data"):
        existing = prospect.property_data or {}
        existing.update(enrichment["property_data"])
        prospect.property_data = existing

    if enrichment.get("owner_data"):
        owner = enrichment["owner_data"]
        if not prospect.first_name and owner.get("owner_name"):
            name = owner["owner_name"]
            if isinstance(name, dict):
                prospect.first_name = name.get("firstNameAndMi", "")
                prospect.last_name = name.get("lastName", "")
            elif isinstance(name, str):
                parts = name.split(" ", 1)
                prospect.first_name = parts[0]
                prospect.last_name = parts[1] if len(parts) > 1 else ""
        if not prospect.mailing_address and owner.get("mailing_address"):
            prospect.mailing_address = owner["mailing_address"]

    # AVM is optional enrichment — log and continue on failure.
    try:
        avm = prospect_data.get_avm(prospect.property_address)
        if avm:
            existing = prospect.property_data or {}
            existing.update(avm)
            prospect.property_data = existing
    except Exception:
        logger.warning("AVM enrichment failed for prospect %s", prospect_id, exc_info=True)

    await db.commit()
    await db.refresh(prospect)

    activity = Activity(
        activity_type="ai_action",
        title="Prospect enriched with ATTOM data",
        prospect_id=prospect_id,
    )
    db.add(activity)
    await db.commit()

    return prospect


# ---------------------------------------------------------------------------
# Convert — turn a prospect into a CRM Contact
# ---------------------------------------------------------------------------

@router.post("/{prospect_id}/convert", response_model=ContactResponse)
async def convert_to_contact(prospect_id: str, db: AsyncSession = Depends(get_db)):
    """Convert a qualified prospect to a Contact for active CRM management."""
    result = await db.execute(select(Prospect).where(Prospect.id == prospect_id))
    prospect = result.scalar_one_or_none()
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")

    if prospect.contact_id:
        raise HTTPException(status_code=400, detail="Prospect already converted")

    contact = Contact(
        first_name=prospect.first_name or "Unknown",
        last_name=prospect.last_name or "Owner",
        email=prospect.email,
        phone=prospect.phone,
        contact_type="lead",
        preferred_parishes=[prospect.property_parish] if prospect.property_parish else [],
        source=f"prospect_{prospect.prospect_type}",
        notes=f"Converted from prospect. Property: {prospect.property_address}, {prospect.property_city}, {prospect.property_state}",
    )
    db.add(contact)
    await db.flush()

    prospect.contact_id = contact.id
    prospect.status = "converted"
    await db.commit()
    await db.refresh(contact)

    activity = Activity(
        activity_type="ai_action",
        title=f"Prospect converted to contact",
        contact_id=contact.id,
        prospect_id=prospect_id,
        description=f"Source: {prospect.prospect_type}, Property: {prospect.property_address}",
    )
    db.add(activity)
    await db.commit()

    return contact


# ---------------------------------------------------------------------------
# Skip Trace — find contact info for a prospect
# ---------------------------------------------------------------------------

@router.post("/{prospect_id}/skip-trace", dependencies=[Depends(_skip_trace_rate_limit)])
async def skip_trace_prospect(prospect_id: str, db: AsyncSession = Depends(get_db)):
    """Run skip tracing to find phone/email for a prospect."""
    result = await db.execute(select(Prospect).where(Prospect.id == prospect_id))
    prospect = result.scalar_one_or_none()
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")

    trace_result = skip_trace_service.skip_trace_single(
        first_name=prospect.first_name,
        last_name=prospect.last_name,
        address=prospect.property_address,
        city=prospect.property_city,
        state=prospect.property_state,
        zip_code=prospect.property_zip,
    )

    # Update prospect with found contact info
    updated = False
    if trace_result.get("phones") and not prospect.phone:
        best_phone = trace_result["phones"][0]
        prospect.phone = best_phone["number"]
        updated = True
    if trace_result.get("emails") and not prospect.email:
        best_email = trace_result["emails"][0]
        prospect.email = best_email["address"]
        updated = True
    if trace_result.get("addresses") and not prospect.mailing_address:
        best_addr = trace_result["addresses"][0]
        prospect.mailing_address = best_addr["address"]
        updated = True

    if updated:
        await db.commit()
        await db.refresh(prospect)

    activity = Activity(
        activity_type="ai_action",
        title=f"Skip trace: {'found data' if trace_result.get('success') else 'no results'}",
        prospect_id=prospect_id,
        extra_data={
            "provider": trace_result.get("provider"),
            "phones_found": len(trace_result.get("phones", [])),
            "emails_found": len(trace_result.get("emails", [])),
        },
    )
    db.add(activity)
    await db.commit()

    return trace_result


@router.post("/batch-skip-trace")
async def batch_skip_trace(
    prospect_ids: list[str] = Body(..., max_length=100),
    db: AsyncSession = Depends(get_db),
):
    """Batch skip trace for multiple prospects (max 100)."""
    result = await db.execute(select(Prospect).where(Prospect.id.in_(prospect_ids)))
    prospects = result.scalars().all()

    prospect_data_list = [
        {
            "id": p.id,
            "first_name": p.first_name,
            "last_name": p.last_name,
            "property_address": p.property_address,
            "property_city": p.property_city,
            "property_state": p.property_state,
            "property_zip": p.property_zip,
        }
        for p in prospects
    ]

    results = skip_trace_service.skip_trace_batch(prospect_data_list)

    # Update prospects with found data
    prospect_map = {p.id: p for p in prospects}
    found_count = 0
    for trace in results:
        pid = trace.get("prospect_id")
        if not pid or pid not in prospect_map:
            continue
        p = prospect_map[pid]
        if trace.get("phones") and not p.phone:
            p.phone = trace["phones"][0]["number"]
            found_count += 1
        if trace.get("emails") and not p.email:
            p.email = trace["emails"][0]["address"]
            found_count += 1

    await db.commit()

    activity = Activity(
        activity_type="ai_action",
        title=f"Batch skip trace: {len(prospects)} searched, {found_count} updated",
    )
    db.add(activity)
    await db.commit()

    return {"searched": len(prospects), "found": found_count, "results": results}


# ---------------------------------------------------------------------------
# Batch DNC Check
# ---------------------------------------------------------------------------

@router.post("/batch-dnc-check")
async def batch_dnc_check(
    prospect_ids: list[str] = Body(..., max_length=200),
    db: AsyncSession = Depends(get_db),
):
    """Check DNC list status for multiple prospects (max 200)."""
    from app.services.prospect_enrichment import check_dnc_list

    result = await db.execute(select(Prospect).where(Prospect.id.in_(prospect_ids)))
    prospects = result.scalars().all()

    checked = 0
    on_dnc = 0
    now = datetime.utcnow()

    for p in prospects:
        if not p.phone:
            continue
        is_dnc = check_dnc_list(p.phone)
        p.dnc_checked = True
        p.dnc_checked_at = now
        p.dnc_listed = is_dnc
        checked += 1
        if is_dnc:
            on_dnc += 1

    await db.commit()

    activity = Activity(
        activity_type="ai_action",
        title=f"Batch DNC check: {checked} checked, {on_dnc} on DNC list",
    )
    db.add(activity)
    await db.commit()

    return {"checked": checked, "on_dnc_list": on_dnc, "skipped_no_phone": len(prospects) - checked}



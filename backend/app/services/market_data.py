"""Market data service using Realty Mole Property API (via RapidAPI).

All functions are sync — FastAPI runs them in a threadpool from async endpoints.
Falls back gracefully when REALTY_MOLE_API_KEY is not configured.
"""

import httpx

from app.config import settings
from app.schemas.market_data import (
    MarketComp,
    MarketCompResponse,
    PropertyLookupResponse,
    PropertyRecord,
)

BASE_URL = "https://realty-mole-property-api.p.rapidapi.com"


def _headers() -> dict[str, str]:
    return {
        "x-rapidapi-key": settings.REALTY_MOLE_API_KEY,
        "x-rapidapi-host": "realty-mole-property-api.p.rapidapi.com",
    }


def is_configured() -> bool:
    return bool(settings.REALTY_MOLE_API_KEY)


def search_comps(
    address: str,
    sqft: int | None = None,
    bedrooms: int | None = None,
    bathrooms: float | None = None,
    comp_count: int = 10,
) -> MarketCompResponse:
    """Search for comparable sales near an address."""
    if not is_configured():
        raise ValueError("REALTY_MOLE_API_KEY not configured")

    params: dict[str, str | int | float] = {
        "address": address,
        "compCount": comp_count,
    }
    if sqft:
        params["squareFootage"] = sqft
    if bedrooms:
        params["bedrooms"] = bedrooms
    if bathrooms:
        params["bathrooms"] = bathrooms

    with httpx.Client(timeout=30) as client:
        resp = client.get(
            f"{BASE_URL}/saleComparables",
            headers=_headers(),
            params=params,
        )
        resp.raise_for_status()
        data = resp.json()

    comps = []
    for item in data:
        comps.append(_parse_comp(item))

    return MarketCompResponse(
        subject_address=address,
        comps=comps,
    )


def lookup_property(address: str) -> PropertyLookupResponse:
    """Look up property records by address."""
    if not is_configured():
        raise ValueError("REALTY_MOLE_API_KEY not configured")

    with httpx.Client(timeout=30) as client:
        resp = client.get(
            f"{BASE_URL}/properties",
            headers=_headers(),
            params={"address": address},
        )
        resp.raise_for_status()
        data = resp.json()

    # API may return a single object or list
    if isinstance(data, dict):
        data = [data]

    records = []
    for item in data:
        records.append(_parse_record(item))

    return PropertyLookupResponse(records=records)


def _parse_comp(item: dict) -> MarketComp:
    """Parse a Realty Mole comp result into our schema."""
    lot_sqft = item.get("lotSize")
    lot_acres = round(lot_sqft / 43560, 2) if lot_sqft else None

    return MarketComp(
        address=item.get("formattedAddress", item.get("addressLine1", "")),
        city=item.get("city", ""),
        state=item.get("state", ""),
        zip_code=item.get("zipCode", ""),
        sale_price=int(item.get("price", 0) or 0),
        sqft=item.get("squareFootage"),
        bedrooms=item.get("bedrooms"),
        bathrooms=item.get("bathrooms"),
        lot_size_acres=lot_acres,
        year_built=item.get("yearBuilt"),
        sale_date=item.get("lastSaleDate"),
        distance_miles=item.get("distance"),
        property_type=item.get("propertyType"),
    )


def _parse_record(item: dict) -> PropertyRecord:
    """Parse a Realty Mole property record into our schema."""
    lot_sqft = item.get("lotSize")
    lot_acres = round(lot_sqft / 43560, 2) if lot_sqft else None

    return PropertyRecord(
        address=item.get("formattedAddress", item.get("addressLine1", "")),
        city=item.get("city", ""),
        county=item.get("county"),
        state=item.get("state", ""),
        zip_code=item.get("zipCode", ""),
        sqft=item.get("squareFootage"),
        bedrooms=item.get("bedrooms"),
        bathrooms=item.get("bathrooms"),
        lot_size_acres=lot_acres,
        year_built=item.get("yearBuilt"),
        property_type=item.get("propertyType"),
        last_sale_price=int(item.get("lastSalePrice", 0) or 0) or None,
        last_sale_date=item.get("lastSaleDate"),
        assessed_value=int(item.get("assessedValue", 0) or 0) or None,
        tax_amount=item.get("taxAmount"),
    )

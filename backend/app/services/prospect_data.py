"""Prospect data service using ATTOM Data API.

All functions are sync — FastAPI runs them in a threadpool from async endpoints.
Falls back gracefully when ATTOM_API_KEY is not configured.

ATTOM API docs: https://api.gateway.attomdata.com/propertyapi/v1.0.0
"""

import httpx

from app.config import settings

BASE_URL = "https://api.gateway.attomdata.com/propertyapi/v1.0.0"


def _headers() -> dict[str, str]:
    return {
        "apikey": settings.ATTOM_API_KEY,
        "Accept": "application/json",
    }


def is_configured() -> bool:
    return bool(settings.ATTOM_API_KEY)


def _check_configured() -> None:
    if not is_configured():
        raise ValueError("ATTOM_API_KEY not configured")


def _fips_code(state: str, county: str) -> str | None:
    """Build a FIPS county code hint for ATTOM queries.

    ATTOM accepts geoIdV4 (FIPS) or textual county+state params depending on
    the endpoint. We pass county/state as text params and let ATTOM resolve.
    This helper is kept as a stub for future FIPS lookups if needed.
    """
    return None


# ---------------------------------------------------------------------------
# Search functions — each returns a list of normalized prospect dicts
# ---------------------------------------------------------------------------

def search_absentee_owners(
    state: str,
    county: str | None = None,
    city: str | None = None,
    zip_code: str | None = None,
    max_results: int = 50,
) -> list[dict]:
    """Search ATTOM for properties where owner address != property address."""
    _check_configured()

    params: dict[str, str | int] = {
        "stateabbrev": state,
        "absenteeInd": "A",  # A = absentee owner
        "pagesize": min(max_results, 100),
    }
    if county:
        params["countyname"] = county
    if city:
        params["city"] = city
    if zip_code:
        params["postalcode"] = zip_code

    with httpx.Client(timeout=30) as client:
        resp = client.get(
            f"{BASE_URL}/property/snapshot",
            headers=_headers(),
            params=params,
        )
        resp.raise_for_status()
        data = resp.json()

    properties = data.get("property", [])
    return [_parse_prospect(item, "absentee_owner") for item in properties]


def search_pre_foreclosures(
    state: str,
    county: str | None = None,
    zip_code: str | None = None,
    max_results: int = 50,
) -> list[dict]:
    """Search ATTOM for pre-foreclosure / NOD filings."""
    _check_configured()

    params: dict[str, str | int] = {
        "stateabbrev": state,
        "pagesize": min(max_results, 100),
    }
    if county:
        params["countyname"] = county
    if zip_code:
        params["postalcode"] = zip_code

    with httpx.Client(timeout=30) as client:
        resp = client.get(
            f"{BASE_URL}/property/preforeclosure",
            headers=_headers(),
            params=params,
        )
        resp.raise_for_status()
        data = resp.json()

    properties = data.get("property", [])
    return [_parse_prospect(item, "pre_foreclosure") for item in properties]


def search_long_term_owners(
    state: str,
    county: str | None = None,
    city: str | None = None,
    zip_code: str | None = None,
    min_years: int = 10,
    max_results: int = 50,
) -> list[dict]:
    """Search for owners who've held property for min_years+ years."""
    _check_configured()

    params: dict[str, str | int] = {
        "stateabbrev": state,
        "minOwnershipYears": min_years,
        "pagesize": min(max_results, 100),
    }
    if county:
        params["countyname"] = county
    if city:
        params["city"] = city
    if zip_code:
        params["postalcode"] = zip_code

    with httpx.Client(timeout=30) as client:
        resp = client.get(
            f"{BASE_URL}/property/snapshot",
            headers=_headers(),
            params=params,
        )
        resp.raise_for_status()
        data = resp.json()

    properties = data.get("property", [])
    return [_parse_prospect(item, "long_term_owner") for item in properties]


def search_tax_delinquent(
    state: str,
    county: str | None = None,
    zip_code: str | None = None,
    max_results: int = 50,
) -> list[dict]:
    """Search for properties with delinquent taxes."""
    _check_configured()

    params: dict[str, str | int] = {
        "stateabbrev": state,
        "taxDelinquentInd": "Y",
        "pagesize": min(max_results, 100),
    }
    if county:
        params["countyname"] = county
    if zip_code:
        params["postalcode"] = zip_code

    with httpx.Client(timeout=30) as client:
        resp = client.get(
            f"{BASE_URL}/property/snapshot",
            headers=_headers(),
            params=params,
        )
        resp.raise_for_status()
        data = resp.json()

    properties = data.get("property", [])
    return [_parse_prospect(item, "tax_delinquent") for item in properties]


def search_vacant_properties(
    state: str,
    county: str | None = None,
    zip_code: str | None = None,
    max_results: int = 50,
) -> list[dict]:
    """Search for properties with vacancy indicators."""
    _check_configured()

    params: dict[str, str | int] = {
        "stateabbrev": state,
        "vacantInd": "Y",
        "pagesize": min(max_results, 100),
    }
    if county:
        params["countyname"] = county
    if zip_code:
        params["postalcode"] = zip_code

    with httpx.Client(timeout=30) as client:
        resp = client.get(
            f"{BASE_URL}/property/snapshot",
            headers=_headers(),
            params=params,
        )
        resp.raise_for_status()
        data = resp.json()

    properties = data.get("property", [])
    return [_parse_prospect(item, "vacant") for item in properties]


def enrich_property(address: str) -> dict:
    """Get full ATTOM property detail for a single address."""
    _check_configured()

    with httpx.Client(timeout=30) as client:
        resp = client.get(
            f"{BASE_URL}/property/detail",
            headers=_headers(),
            params={"address1": address},
        )
        resp.raise_for_status()
        data = resp.json()

    properties = data.get("property", [])
    if not properties:
        return {}

    item = properties[0]
    return _parse_enrichment(item)


def get_avm(address: str) -> dict:
    """Get automated valuation model estimate for a property."""
    _check_configured()

    with httpx.Client(timeout=30) as client:
        resp = client.get(
            f"{BASE_URL}/valuation/homeequity",
            headers=_headers(),
            params={"address1": address},
        )
        resp.raise_for_status()
        data = resp.json()

    properties = data.get("property", [])
    if not properties:
        return {}

    item = properties[0]
    avm = item.get("avm", {})
    return {
        "avm_value": avm.get("amount", {}).get("value"),
        "avm_high": avm.get("amount", {}).get("high"),
        "avm_low": avm.get("amount", {}).get("low"),
        "equity_percent": avm.get("calculated", {}).get("equityPercent"),
    }


# ---------------------------------------------------------------------------
# ATTOM response parsing — normalize into our prospect format
# ---------------------------------------------------------------------------

def _parse_prospect(item: dict, prospect_type: str) -> dict:
    """Normalize an ATTOM property record into a prospect dict for import."""
    address = item.get("address", {})
    building = item.get("building", {})
    summary = item.get("summary", {})
    lot = item.get("lot", {})
    sale = item.get("sale", {})
    assessment = item.get("assessment", {})
    owner = item.get("owner", {})
    vintage = item.get("vintage", {})

    # Build property address
    line1 = address.get("line1", "")
    city = address.get("locality", "")
    county_name = address.get("countrySubd", "") or address.get("county", "")
    state = address.get("countrySecSubd", "") or summary.get("propSubType", "")
    # ATTOM uses different fields — try the most common ones
    state_abbrev = address.get("countrySubd", "")
    if len(state_abbrev) != 2:
        state_abbrev = "LA"
    zip_code = address.get("postal1", "")

    # Owner info
    owner_name = owner.get("owner1", {})
    first_name = owner_name.get("firstNameAndMi", "") if isinstance(owner_name, dict) else ""
    last_name = owner_name.get("lastName", "") if isinstance(owner_name, dict) else ""
    if not first_name and not last_name and isinstance(owner_name, str):
        parts = owner_name.split(" ", 1)
        first_name = parts[0] if parts else ""
        last_name = parts[1] if len(parts) > 1 else ""

    mailing = owner.get("mailingAddressOneline", "")

    # Assessed values
    assessed = assessment.get("assessed", {})
    market = assessment.get("market", {})
    tax = assessment.get("tax", {})

    # Last sale
    last_sale = sale.get("saleTransDate", "")
    last_sale_price = sale.get("saleAmountData", {}).get("saleAmt")
    if isinstance(last_sale_price, str):
        try:
            last_sale_price = int(last_sale_price)
        except ValueError:
            last_sale_price = None

    # Build motivation signals based on prospect type
    signals: dict = {}
    if prospect_type == "absentee_owner":
        signals["absentee"] = True
        signals["mailing_differs"] = bool(mailing and mailing != line1)
    elif prospect_type == "pre_foreclosure":
        foreclosure = item.get("foreclosure", {})
        signals["foreclosure_status"] = foreclosure.get("foreclosureStatus", "")
        signals["recording_date"] = foreclosure.get("recordingDate", "")
    elif prospect_type == "long_term_owner":
        signals["ownership_years"] = vintage.get("ownershipLengthYears", 0)
    elif prospect_type == "tax_delinquent":
        signals["tax_delinquent"] = True
        signals["tax_delinquent_amount"] = tax.get("taxDelinquentAmount", 0)
    elif prospect_type == "vacant":
        signals["vacant"] = True

    # Property data for enrichment
    sqft = building.get("size", {}).get("livingSize") or building.get("size", {}).get("bldgSize")
    beds = building.get("rooms", {}).get("beds")
    baths = building.get("rooms", {}).get("bathsTotal")
    year_built = summary.get("yearBuilt")
    lot_acres = lot.get("lotSize1")
    if lot_acres and isinstance(lot_acres, (int, float)) and lot_acres > 100:
        # Likely in sqft, convert
        lot_acres = round(lot_acres / 43560, 2)

    property_data = {
        "sqft": sqft,
        "bedrooms": beds,
        "bathrooms": baths,
        "year_built": year_built,
        "lot_size_acres": lot_acres,
        "assessed_value": assessed.get("assdTtlValue"),
        "market_value": market.get("mktTtlValue"),
        "tax_amount": tax.get("taxAmt"),
        "last_sale_date": last_sale,
        "last_sale_price": last_sale_price,
        "property_type": summary.get("propType", ""),
    }

    return {
        "first_name": first_name or None,
        "last_name": last_name or None,
        "mailing_address": mailing or None,
        "property_address": line1,
        "property_city": city,
        "property_parish": county_name,
        "property_state": state_abbrev,
        "property_zip": zip_code,
        "prospect_type": prospect_type,
        "motivation_signals": signals,
        "property_data": property_data,
        "data_source": "attom",
        "source_record_id": str(item.get("identifier", {}).get("attomId", "")),
    }


def _parse_enrichment(item: dict) -> dict:
    """Parse full ATTOM property detail into enrichment data."""
    building = item.get("building", {})
    summary = item.get("summary", {})
    lot = item.get("lot", {})
    sale = item.get("sale", {})
    assessment = item.get("assessment", {})
    owner = item.get("owner", {})
    utilities = item.get("utilities", {})

    assessed = assessment.get("assessed", {})
    market = assessment.get("market", {})
    tax = assessment.get("tax", {})
    sqft = building.get("size", {}).get("livingSize") or building.get("size", {}).get("bldgSize")
    lot_acres = lot.get("lotSize1")
    if lot_acres and isinstance(lot_acres, (int, float)) and lot_acres > 100:
        lot_acres = round(lot_acres / 43560, 2)

    return {
        "property_data": {
            "sqft": sqft,
            "bedrooms": building.get("rooms", {}).get("beds"),
            "bathrooms": building.get("rooms", {}).get("bathsTotal"),
            "year_built": summary.get("yearBuilt"),
            "lot_size_acres": lot_acres,
            "assessed_value": assessed.get("assdTtlValue"),
            "market_value": market.get("mktTtlValue"),
            "tax_amount": tax.get("taxAmt"),
            "last_sale_date": sale.get("saleTransDate", ""),
            "last_sale_price": sale.get("saleAmountData", {}).get("saleAmt"),
            "property_type": summary.get("propType", ""),
            "stories": building.get("summary", {}).get("storyCount"),
            "heating": utilities.get("heatingType", ""),
            "cooling": utilities.get("coolingType", ""),
            "construction": building.get("construction", {}).get("constructionType", ""),
            "roof": building.get("construction", {}).get("roofType", ""),
        },
        "owner_data": {
            "owner_name": owner.get("owner1", ""),
            "owner2_name": owner.get("owner2", ""),
            "mailing_address": owner.get("mailingAddressOneline", ""),
            "ownership_length_years": item.get("vintage", {}).get("ownershipLengthYears"),
        },
    }

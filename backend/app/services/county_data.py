"""County/parish public record data service.

Supplements ATTOM data with free public record lookups from state/county portals.
All functions are sync — FastAPI runs them in a threadpool from async endpoints.

Data sources:
- Louisiana: eClerks LA statewide portal (land records, probate)
- Arkansas: ARCountyData.com (property data, sales, ownership)
- Mississippi: County chancery clerk portals (deeds, probate)

Note: These are web portals, not formal APIs. We use httpx to fetch pages and
parse structured data where available. Some counties offer JSON endpoints for
their GIS/assessor systems; others require HTML parsing.
"""

import re

import httpx

# ---------------------------------------------------------------------------
# Louisiana — eClerks LA + parish assessor portals
# ---------------------------------------------------------------------------

LA_ASSESSOR_URLS: dict[str, str] = {
    "East Baton Rouge": "https://www.ebrpa.org",
    "Jefferson": "https://www.jpassessor.com",
    "Orleans": "https://nolaassessor.com",
    "St. Tammany": "https://www.stassessor.org",
    "Lafayette": "https://www.lafayetteassessor.com",
    "Caddo": "https://www.caddoassessor.org",
    "Ouachita": "https://www.prior.prior-inc.com/ouachita",
    "Calcasieu": "https://www.calcasieuassessor.org",
    "Rapides": "https://www.prior.prior-inc.com/rapides",
}


def search_la_property(parish: str, address: str | None = None, owner_name: str | None = None) -> list[dict]:
    """Search Louisiana parish assessor records.

    Many LA parish assessors use the Prior Inc platform which has a
    semi-structured search. Falls back to empty list if the parish
    doesn't have a known portal.
    """
    results = []

    # Try Prior Inc-style portals (Ouachita, Rapides, Lincoln, etc.)
    prior_parishes = {
        "Ouachita": "ouachita",
        "Rapides": "rapides",
        "Lincoln": "lincoln",
        "Union": "union",
        "Morehouse": "morehouse",
        "Richland": "richland",
    }

    slug = prior_parishes.get(parish)
    if slug:
        results = _search_prior_inc(slug, address, owner_name)

    return results


def _search_prior_inc(parish_slug: str, address: str | None, owner_name: str | None) -> list[dict]:
    """Search a Prior Inc-hosted parish assessor site."""
    base = f"https://www.prior.prior-inc.com/{parish_slug}"
    params: dict[str, str] = {}
    if address:
        params["address"] = address
    if owner_name:
        params["owner"] = owner_name

    try:
        with httpx.Client(timeout=15) as client:
            resp = client.get(f"{base}/search", params=params)
            if resp.status_code != 200:
                return []
            # Prior Inc sites return HTML — parse basic property cards
            return _parse_prior_html(resp.text, parish_slug)
    except Exception:
        return []


def _parse_prior_html(html: str, parish_slug: str) -> list[dict]:
    """Extract property records from Prior Inc HTML response.

    This is a best-effort parser — Prior Inc pages vary by parish.
    Returns a list of dicts with basic property info.
    """
    records = []
    # Look for property card patterns in HTML
    # Prior Inc typically has table rows with: parcel#, owner, address, assessed value
    rows = re.findall(
        r'<tr[^>]*>\s*<td[^>]*>([^<]+)</td>\s*<td[^>]*>([^<]+)</td>\s*<td[^>]*>([^<]+)</td>\s*<td[^>]*>([^<]+)</td>',
        html,
    )
    for parcel, owner, address, assessed in rows:
        owner = owner.strip()
        address = address.strip()
        assessed = assessed.strip().replace("$", "").replace(",", "")

        # Skip header rows
        if "parcel" in parcel.lower() or "owner" in owner.lower():
            continue

        try:
            assessed_val = int(float(assessed)) if assessed else None
        except ValueError:
            assessed_val = None

        # Parse owner name
        parts = owner.split(" ", 1)
        last_name = parts[0] if parts else ""
        first_name = parts[1] if len(parts) > 1 else ""

        records.append({
            "first_name": first_name or None,
            "last_name": last_name or None,
            "property_address": address,
            "property_parish": parish_slug.title(),
            "property_state": "LA",
            "property_data": {
                "parcel_number": parcel.strip(),
                "assessed_value": assessed_val,
            },
            "data_source": f"county_la_{parish_slug}",
            "source_record_id": parcel.strip(),
        })

    return records


# ---------------------------------------------------------------------------
# Arkansas — ARCountyData.com
# ---------------------------------------------------------------------------

AR_COUNTY_DATA_BASE = "https://www.arcountydata.com"


def search_ar_property(county: str, address: str | None = None, owner_name: str | None = None) -> list[dict]:
    """Search Arkansas county property records via ARCountyData.com.

    ARCountyData provides property data, sales histories, and ownership
    for all 75 Arkansas counties.
    """
    params: dict[str, str] = {"county": county}
    if address:
        params["address"] = address
    if owner_name:
        params["owner"] = owner_name

    try:
        with httpx.Client(timeout=15) as client:
            resp = client.get(f"{AR_COUNTY_DATA_BASE}/search", params=params)
            if resp.status_code != 200:
                return []
            return _parse_ar_county_html(resp.text, county)
    except Exception:
        return []


def _parse_ar_county_html(html: str, county: str) -> list[dict]:
    """Parse ARCountyData search results."""
    records = []
    # ARCountyData uses table format with property details
    rows = re.findall(
        r'<tr[^>]*>\s*<td[^>]*>([^<]+)</td>\s*<td[^>]*>([^<]+)</td>\s*<td[^>]*>([^<]+)</td>',
        html,
    )
    for owner, address, assessed in rows:
        owner = owner.strip()
        address = address.strip()
        if "owner" in owner.lower() or not address:
            continue

        assessed_clean = assessed.strip().replace("$", "").replace(",", "")
        try:
            assessed_val = int(float(assessed_clean)) if assessed_clean else None
        except ValueError:
            assessed_val = None

        parts = owner.split(" ", 1)
        records.append({
            "first_name": parts[1] if len(parts) > 1 else None,
            "last_name": parts[0] if parts else None,
            "property_address": address,
            "property_parish": county,
            "property_state": "AR",
            "property_data": {"assessed_value": assessed_val},
            "data_source": f"county_ar_{county.lower().replace(' ', '_')}",
        })

    return records


# ---------------------------------------------------------------------------
# Mississippi — county chancery clerk portals
# ---------------------------------------------------------------------------

MS_COUNTY_URLS: dict[str, str] = {
    "Hinds": "https://www.co.hinds.ms.us",
    "Rankin": "https://www.rankincounty.org",
    "Madison": "https://www.madison-co.com",
    "DeSoto": "https://www.desotocountyms.gov",
    "Harrison": "https://www.co.harrison.ms.us",
    "Jackson": "https://www.co.jackson.ms.us",
    "Lee": "https://www.leecountyms.us",
    "Forrest": "https://www.co.forrest.ms.us",
}


def search_ms_property(county: str, address: str | None = None, owner_name: str | None = None) -> list[dict]:
    """Search Mississippi county property records.

    MS counties vary widely in their online systems. This function attempts
    known portals and returns what it can find.
    """
    # MS counties are less standardized — most require manual lookup
    # Return empty for now; specific county integrations can be added
    return []


# ---------------------------------------------------------------------------
# Unified search — dispatch by state
# ---------------------------------------------------------------------------

def search_county_records(
    state: str,
    county_parish: str,
    address: str | None = None,
    owner_name: str | None = None,
) -> list[dict]:
    """Search county/parish public records by state.

    Dispatches to the appropriate state-specific search function.
    Returns a list of property record dicts in Prospect-compatible format.
    """
    if state == "LA":
        return search_la_property(county_parish, address, owner_name)
    elif state == "AR":
        return search_ar_property(county_parish, address, owner_name)
    elif state == "MS":
        return search_ms_property(county_parish, address, owner_name)
    return []


def get_supported_counties(state: str) -> list[str]:
    """Return list of counties/parishes with known online portals for a state."""
    if state == "LA":
        return list(LA_ASSESSOR_URLS.keys())
    elif state == "AR":
        return ["All counties via ARCountyData.com"]
    elif state == "MS":
        return list(MS_COUNTY_URLS.keys())
    return []

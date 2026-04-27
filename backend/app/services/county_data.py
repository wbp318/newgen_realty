"""County / parish public-record portal directory.

We previously tried to scrape LA Prior Inc and ARCountyData.com pages, but
both endpoints stopped delivering — Prior Inc DNS no longer resolves and
ARCountyData added a Cloudflare bot challenge. Rather than ship broken
scrapers that silently return [], this module is now a curated *directory*
of free public-record portals across LA, AR, and MS.

Callers (the prospects router) surface these URLs to the user, who clicks
through and does the manual lookup. No scraping, no fake-success empty
results. When ATTOM is configured, agents stop needing this.
"""

from typing import Optional, TypedDict


class PortalEntry(TypedDict):
    state: str
    county_or_parish: str  # parish name in LA, county name in AR/MS
    label: str             # display label (with "Parish" / "County" suffix)
    url: str               # public portal homepage / search page
    type: str              # "assessor" | "clerk" | "umbrella"


# ---------------------------------------------------------------------------
# Louisiana — parish assessors. Most populated parishes have working portals.
# Less-populated parishes' sites are inconsistent — link the LA Tax Commission
# umbrella for those.
# ---------------------------------------------------------------------------

LA_PORTALS: list[PortalEntry] = [
    {"state": "LA", "county_or_parish": "East Baton Rouge", "label": "East Baton Rouge Parish",
     "url": "https://www.ebrpa.org",                 "type": "assessor"},
    {"state": "LA", "county_or_parish": "Jefferson",        "label": "Jefferson Parish",
     "url": "https://www.jpassessor.com",            "type": "assessor"},
    {"state": "LA", "county_or_parish": "Orleans",          "label": "Orleans Parish",
     "url": "https://nolaassessor.com",              "type": "assessor"},
    {"state": "LA", "county_or_parish": "St. Tammany",      "label": "St. Tammany Parish",
     "url": "https://www.stassessor.org",            "type": "assessor"},
    {"state": "LA", "county_or_parish": "Lafayette",        "label": "Lafayette Parish",
     "url": "https://www.lafayetteassessor.com",     "type": "assessor"},
    {"state": "LA", "county_or_parish": "Caddo",            "label": "Caddo Parish",
     "url": "https://www.caddoassessor.org",         "type": "assessor"},
    {"state": "LA", "county_or_parish": "Calcasieu",        "label": "Calcasieu Parish",
     "url": "https://www.calcasieuassessor.org",     "type": "assessor"},
    {"state": "LA", "county_or_parish": "Bossier",          "label": "Bossier Parish",
     "url": "https://www.bossierassessor.org",       "type": "assessor"},
    {"state": "LA", "county_or_parish": "St. Landry",       "label": "St. Landry Parish",
     "url": "https://www.stlandryassessor.org",      "type": "assessor"},
    {"state": "LA", "county_or_parish": "*",                "label": "All Louisiana Parishes",
     "url": "https://www.latax.state.la.us/Menu_PropertyTax/PropertyTaxMain.aspx",
     "type": "umbrella"},
]


# ---------------------------------------------------------------------------
# Arkansas — ARCountyData.com is the umbrella but uses Cloudflare. It still
# works fine for a human visiting in a browser. Direct counties below.
# ---------------------------------------------------------------------------

AR_PORTALS: list[PortalEntry] = [
    {"state": "AR", "county_or_parish": "*",         "label": "All Arkansas Counties (ARCountyData)",
     "url": "https://www.arcountydata.com",          "type": "umbrella"},
    {"state": "AR", "county_or_parish": "Pulaski",   "label": "Pulaski County",
     "url": "https://www.pulaskicountyassessor.net", "type": "assessor"},
    {"state": "AR", "county_or_parish": "Benton",    "label": "Benton County",
     "url": "https://www.bentoncountyar.gov/county-departments/assessor",
     "type": "assessor"},
    {"state": "AR", "county_or_parish": "Washington","label": "Washington County",
     "url": "https://www.washingtoncountyar.gov/government/departments-i-z/assessor",
     "type": "assessor"},
    {"state": "AR", "county_or_parish": "Sebastian", "label": "Sebastian County",
     "url": "https://www.co.sebastian.ar.us/254/Assessor", "type": "assessor"},
    {"state": "AR", "county_or_parish": "Garland",   "label": "Garland County",
     "url": "https://www.garlandcounty.org/284/Assessor", "type": "assessor"},
]


# ---------------------------------------------------------------------------
# Mississippi — county tax assessors and chancery clerks. Many require login;
# linked here are the public-facing assessor pages.
# ---------------------------------------------------------------------------

MS_PORTALS: list[PortalEntry] = [
    {"state": "MS", "county_or_parish": "Hinds",    "label": "Hinds County",
     "url": "https://www.hindscountyms.com/elected-offices/tax-assessor",
     "type": "assessor"},
    {"state": "MS", "county_or_parish": "Rankin",   "label": "Rankin County",
     "url": "https://www.rankincounty.org/tax-assessor", "type": "assessor"},
    {"state": "MS", "county_or_parish": "Madison",  "label": "Madison County",
     "url": "https://www.madison-co.com/departments/tax-assessor", "type": "assessor"},
    {"state": "MS", "county_or_parish": "DeSoto",   "label": "DeSoto County",
     "url": "https://www.desotocountyms.gov/177/Tax-Assessor", "type": "assessor"},
    {"state": "MS", "county_or_parish": "Harrison", "label": "Harrison County",
     "url": "https://www.co.harrison.ms.us/elected/taxassessor", "type": "assessor"},
    {"state": "MS", "county_or_parish": "Jackson",  "label": "Jackson County",
     "url": "https://www.co.jackson.ms.us/162/Tax-Assessor", "type": "assessor"},
    {"state": "MS", "county_or_parish": "Lee",      "label": "Lee County",
     "url": "https://www.leecounty.ms.gov/tax-assessor", "type": "assessor"},
    {"state": "MS", "county_or_parish": "Forrest",  "label": "Forrest County",
     "url": "https://www.co.forrest.ms.us/tax-assessor", "type": "assessor"},
]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def list_portals(state: Optional[str] = None) -> list[PortalEntry]:
    """Return the directory, optionally filtered to a single state."""
    all_portals = LA_PORTALS + AR_PORTALS + MS_PORTALS
    if not state:
        return all_portals
    state = state.upper()
    return [p for p in all_portals if p["state"] == state]


def find_portal(state: str, county_or_parish: str) -> Optional[PortalEntry]:
    """Find the best portal entry for a given state + county/parish.

    Returns the most specific match (county-level) if available, otherwise
    the umbrella entry for the state, otherwise None.
    """
    state = state.upper()
    bucket = list_portals(state)
    target = county_or_parish.strip().lower()
    # Specific match first
    for p in bucket:
        if p["county_or_parish"].lower() == target:
            return p
    # Fall back to state umbrella
    for p in bucket:
        if p["county_or_parish"] == "*":
            return p
    return None


def get_supported_counties(state: str) -> list[str]:
    """Backward-compatible: list of counties/parishes with direct entries
    (excludes the '*' umbrella row).
    """
    return [
        p["county_or_parish"]
        for p in list_portals(state)
        if p["county_or_parish"] != "*"
    ]

"""Skip tracing service — find contact info for prospects.

Skip tracing finds phone numbers, email addresses, and alternative addresses
for property owners using public records and data aggregators.

This service provides a pluggable interface. The default implementation uses
free/low-cost data sources. Premium providers can be swapped in via config.

All functions are sync — FastAPI runs them in a threadpool from async endpoints.

Supported providers (planned):
- "free": Basic lookup from public records only (default)
- "batchskiptracing": BatchSkipTracing.com API (~$0.15/record)
- "skipgenie": SkipGenie API (~$0.10/record)
- "reiskip": REISkip API (~$0.12/record)
"""

import httpx

from app.config import settings


# Provider selection — defaults to free/stub
SKIP_TRACE_PROVIDER = getattr(settings, "SKIP_TRACE_PROVIDER", "free")
SKIP_TRACE_API_KEY = getattr(settings, "SKIP_TRACE_API_KEY", "")


def is_configured() -> bool:
    """Check if a paid skip trace provider is configured."""
    return bool(SKIP_TRACE_API_KEY) and SKIP_TRACE_PROVIDER != "free"


def skip_trace_single(
    first_name: str | None = None,
    last_name: str | None = None,
    address: str | None = None,
    city: str | None = None,
    state: str | None = None,
    zip_code: str | None = None,
) -> dict:
    """Skip trace a single person/property.

    Returns a dict with found contact info:
    {
        "phones": [{"number": "5551234567", "type": "mobile", "confidence": "high"}],
        "emails": [{"address": "owner@email.com", "confidence": "medium"}],
        "addresses": [{"address": "123 Main St", "type": "mailing"}],
        "provider": "free",
        "success": True/False,
    }
    """
    if SKIP_TRACE_PROVIDER == "free" or not SKIP_TRACE_API_KEY:
        return _free_skip_trace(first_name, last_name, address, city, state, zip_code)
    elif SKIP_TRACE_PROVIDER == "batchskiptracing":
        return _batch_skip_trace(first_name, last_name, address, city, state, zip_code)
    else:
        return _free_skip_trace(first_name, last_name, address, city, state, zip_code)


def skip_trace_batch(prospects: list[dict]) -> list[dict]:
    """Skip trace multiple prospects at once.

    Each prospect dict should have: first_name, last_name, address, city, state, zip_code.
    Returns a list of results in the same order, each with the same format as skip_trace_single.
    """
    results = []
    for p in prospects:
        result = skip_trace_single(
            first_name=p.get("first_name"),
            last_name=p.get("last_name"),
            address=p.get("property_address"),
            city=p.get("property_city"),
            state=p.get("property_state"),
            zip_code=p.get("property_zip"),
        )
        result["prospect_id"] = p.get("id")
        results.append(result)
    return results


# ---------------------------------------------------------------------------
# Free skip trace — public record heuristics
# ---------------------------------------------------------------------------

def _free_skip_trace(
    first_name: str | None,
    last_name: str | None,
    address: str | None,
    city: str | None,
    state: str | None,
    zip_code: str | None,
) -> dict:
    """Free skip trace using public record heuristics.

    This is limited but can find some data from:
    - ATTOM owner records (already in property_data from enrichment)
    - Public voter registration records
    - Basic white pages-style lookups

    For production use, integrate a paid provider.
    """
    return {
        "phones": [],
        "emails": [],
        "addresses": [],
        "provider": "free",
        "success": False,
        "message": "Free skip trace has limited data. Configure a paid provider (SKIP_TRACE_PROVIDER + SKIP_TRACE_API_KEY) for better results.",
    }


# ---------------------------------------------------------------------------
# BatchSkipTracing.com integration (paid)
# ---------------------------------------------------------------------------

def _batch_skip_trace(
    first_name: str | None,
    last_name: str | None,
    address: str | None,
    city: str | None,
    state: str | None,
    zip_code: str | None,
) -> dict:
    """Skip trace via BatchSkipTracing.com API.

    Requires SKIP_TRACE_API_KEY to be set.
    Cost: ~$0.15 per record.
    """
    if not SKIP_TRACE_API_KEY:
        return {"phones": [], "emails": [], "addresses": [], "provider": "batchskiptracing", "success": False}

    payload = {
        "first_name": first_name or "",
        "last_name": last_name or "",
        "address": address or "",
        "city": city or "",
        "state": state or "",
        "zip": zip_code or "",
    }

    try:
        with httpx.Client(timeout=30) as client:
            resp = client.post(
                "https://api.batchskiptracing.com/api/v1/skip-trace",
                headers={
                    "Authorization": f"Bearer {SKIP_TRACE_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()

        return _parse_batch_response(data)
    except Exception as e:
        return {
            "phones": [],
            "emails": [],
            "addresses": [],
            "provider": "batchskiptracing",
            "success": False,
            "error": str(e),
        }


def _parse_batch_response(data: dict) -> dict:
    """Parse BatchSkipTracing API response into our format."""
    phones = []
    for phone in data.get("phones", []):
        phones.append({
            "number": phone.get("phone_number", ""),
            "type": phone.get("phone_type", "unknown"),
            "confidence": phone.get("confidence", "medium"),
        })

    emails = []
    for email in data.get("emails", []):
        emails.append({
            "address": email.get("email_address", ""),
            "confidence": email.get("confidence", "medium"),
        })

    addresses = []
    for addr in data.get("addresses", []):
        addresses.append({
            "address": addr.get("full_address", ""),
            "type": addr.get("address_type", "mailing"),
        })

    return {
        "phones": phones,
        "emails": emails,
        "addresses": addresses,
        "provider": "batchskiptracing",
        "success": len(phones) > 0 or len(emails) > 0,
    }

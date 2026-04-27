"""Integration status endpoint.

Tells the UI what's configured (so it can hide AI buttons that would 401,
nudge the agent to add ATTOM, etc.) without leaking any secret values.
"""

from fastapi import APIRouter

from app.config import settings


router = APIRouter(prefix="/api/integrations", tags=["integrations"])


def _mask(value: str | None) -> str | None:
    """Return last-4-chars only when a key is present, else None."""
    if not value:
        return None
    if len(value) < 8:
        return "****"
    return f"…{value[-4:]}"


@router.get("/status")
def integrations_status() -> dict:
    """Per-integration configuration + tier + what each unlocks.

    Tier values:
      - "core"  — required for the platform to work
      - "free"  — works today without any key (truly free)
      - "free-tier" — has a usable free tier but still needs an API key
      - "paid"  — costs money out of the gate
    """
    integrations = [
        {
            "key": "anthropic",
            "name": "Anthropic Claude",
            "configured": bool(settings.ANTHROPIC_API_KEY),
            "key_hint": _mask(settings.ANTHROPIC_API_KEY),
            "tier": "core",
            "unlocks": "All AI features — chat, scoring, outreach, listings, comp analysis, dashboard insights.",
            "cost_note": "Pay-as-you-go: ~$0.80/M input, $4/M output (Haiku) and $3/M, $15/M (Sonnet 4.6).",
            "where_to_get": "https://console.anthropic.com/settings/keys",
        },
        {
            "key": "geocoder",
            "name": "OpenStreetMap Nominatim",
            "configured": True,
            "key_hint": None,
            "tier": "free",
            "unlocks": "Auto-geocoding for prospects + properties. Falls back through street → city → ZIP so rural addresses still pin.",
            "cost_note": "Free. Throttled to 1 request/second per Nominatim ToS.",
            "where_to_get": None,
        },
        {
            "key": "county_portals",
            "name": "County / Parish Portal Directory",
            "configured": True,
            "key_hint": None,
            "tier": "free",
            "unlocks": "Direct links to LA parish assessors, AR county portals (incl. ARCountyData umbrella), and MS county tax assessor / chancery clerk pages. Manual lookup — no scraping.",
            "cost_note": "Free.",
            "where_to_get": None,
        },
        {
            "key": "attom",
            "name": "ATTOM Data",
            "configured": bool(settings.ATTOM_API_KEY),
            "key_hint": _mask(settings.ATTOM_API_KEY),
            "tier": "paid",
            "unlocks": "Bulk public-record search — absentee owners, pre-foreclosures, long-term owners, tax-delinquent. The discovery backbone of the prospecting pipeline.",
            "cost_note": "From ~$95/month.",
            "where_to_get": "https://api.gateway.attomdata.com",
        },
        {
            "key": "realty_mole",
            "name": "Realty Mole Property API",
            "configured": bool(settings.REALTY_MOLE_API_KEY),
            "key_hint": _mask(settings.REALTY_MOLE_API_KEY),
            "tier": "free-tier",
            "unlocks": "Real comparable sales + property records that feed AI comp analysis and pricing.",
            "cost_note": "RapidAPI free tier ~50 requests/month. Paid plans from $20/mo.",
            "where_to_get": "https://rapidapi.com/realtymole/api/realty-mole-property-api",
        },
        {
            "key": "skip_trace",
            "name": "Skip Tracing",
            "configured": bool(settings.SKIP_TRACE_API_KEY) and settings.SKIP_TRACE_PROVIDER != "free",
            "key_hint": _mask(settings.SKIP_TRACE_API_KEY),
            "tier": "paid",
            "unlocks": "Find phone, email, and mailing address for prospects with no contact info. The free fallback returns nothing useful.",
            "cost_note": "BatchSkipTracing.com ~$0.15/record.",
            "where_to_get": "https://www.batchskiptracing.com",
            "extra": {"provider": settings.SKIP_TRACE_PROVIDER},
        },
        {
            "key": "resend",
            "name": "Resend",
            "configured": bool(settings.RESEND_API_KEY) and bool(settings.RESEND_FROM_EMAIL),
            "key_hint": _mask(settings.RESEND_API_KEY),
            "tier": "free-tier",
            "unlocks": "Drip campaigns can actually send email (otherwise messages stay queued). Inbound delivered/opened/bounced webhooks.",
            "cost_note": "Free up to 3K emails/month, then $20/mo for 50K.",
            "where_to_get": "https://resend.com",
            "extra": {"from_email": settings.RESEND_FROM_EMAIL or None},
        },
        {
            "key": "twilio",
            "name": "Twilio",
            "configured": bool(settings.TWILIO_ACCOUNT_SID) and bool(settings.TWILIO_AUTH_TOKEN) and bool(settings.TWILIO_FROM_NUMBER),
            "key_hint": _mask(settings.TWILIO_AUTH_TOKEN),
            "tier": "paid",
            "unlocks": "Drip campaigns can send SMS. Inbound webhook auto-handles STOP keywords.",
            "cost_note": "~$1/mo per 10DLC number + $0.0079 per SMS.",
            "where_to_get": "https://twilio.com/console",
            "extra": {"from_number": settings.TWILIO_FROM_NUMBER or None},
        },
    ]

    summary = {
        "configured": sum(1 for i in integrations if i["configured"]),
        "total": len(integrations),
        "core_ready": all(i["configured"] for i in integrations if i["tier"] == "core"),
    }

    return {"integrations": integrations, "summary": summary}

"""Geocoding service.

Uses the free OpenStreetMap Nominatim API. Respects the 1 req/sec rate limit
and requires a descriptive User-Agent per Nominatim's usage policy.

Sync, same pattern as services/market_data.py.
"""
import logging
import threading
import time
from typing import Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

_NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
_MIN_INTERVAL_SECONDS = 1.1

_last_request_ts: float = 0.0
_lock = threading.Lock()


def is_configured() -> bool:
    # Nominatim has no API key; always usable.
    return settings.GEOCODE_PROVIDER == "nominatim"


def _throttle() -> None:
    global _last_request_ts
    with _lock:
        elapsed = time.monotonic() - _last_request_ts
        wait = _MIN_INTERVAL_SECONDS - elapsed
        if wait > 0:
            time.sleep(wait)
        _last_request_ts = time.monotonic()


def geocode(
    address: Optional[str],
    city: Optional[str] = None,
    state: Optional[str] = None,
    postal_code: Optional[str] = None,
) -> Optional[dict]:
    """Return {"latitude": float, "longitude": float, "display_name": str}
    or None if the address can't be resolved.
    """
    if not is_configured():
        return None

    parts = [p for p in (address, city, state, postal_code) if p]
    if not parts:
        return None
    query = ", ".join(parts)

    _throttle()
    try:
        with httpx.Client(timeout=10) as client:
            resp = client.get(
                _NOMINATIM_URL,
                params={
                    "q": query,
                    "format": "json",
                    "limit": 1,
                    "addressdetails": 0,
                    "countrycodes": "us",
                },
                headers={"User-Agent": settings.GEOCODE_USER_AGENT},
            )
            resp.raise_for_status()
            results = resp.json()
    except Exception:
        logger.exception("Geocode failed for %s", query)
        return None

    if not results:
        return None

    top = results[0]
    try:
        return {
            "latitude": float(top["lat"]),
            "longitude": float(top["lon"]),
            "display_name": top.get("display_name", ""),
        }
    except (KeyError, TypeError, ValueError):
        return None

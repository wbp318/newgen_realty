"""Twilio SMS sending service.

Sync, same pattern as services/market_data.py: is_configured() guard,
raises clean error messages, no raw exception leak.
"""
import logging

from app.config import settings

logger = logging.getLogger(__name__)


def is_configured() -> bool:
    return bool(
        settings.TWILIO_ACCOUNT_SID
        and settings.TWILIO_AUTH_TOKEN
        and settings.TWILIO_FROM_NUMBER
    )


def send_sms(to: str, body: str) -> dict:
    """Send an SMS via Twilio.

    Returns {"provider_message_id": twilio_sid, "status": "sent"}.
    Raises ValueError with a generic message on failure.
    """
    if not is_configured():
        raise ValueError("Twilio is not configured")

    try:
        from twilio.rest import Client
    except ImportError as e:
        raise ValueError("Twilio SDK not installed") from e

    # Twilio requires E.164 format (+1...). Prepend +1 for bare 10-digit US numbers.
    normalized = to.strip()
    if not normalized.startswith("+"):
        digits = "".join(c for c in normalized if c.isdigit())
        if len(digits) == 10:
            normalized = f"+1{digits}"
        elif len(digits) == 11 and digits.startswith("1"):
            normalized = f"+{digits}"
        else:
            raise ValueError("Invalid phone number format")

    client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

    try:
        message = client.messages.create(
            to=normalized,
            from_=settings.TWILIO_FROM_NUMBER,
            body=body,
        )
    except Exception as e:
        logger.exception("Twilio send failed for %s", to)
        raise ValueError("SMS send failed. Please try again later.") from e

    return {"provider_message_id": message.sid, "status": "sent"}

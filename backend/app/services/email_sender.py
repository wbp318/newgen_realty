"""Resend email sending service.

Sync, same pattern as services/market_data.py: is_configured() guard,
raises clean error messages, no raw exception leak.
"""
import logging

from app.config import settings

logger = logging.getLogger(__name__)


def is_configured() -> bool:
    return bool(settings.RESEND_API_KEY and settings.RESEND_FROM_EMAIL)


def send_email(
    to: str,
    subject: str,
    body_text: str,
    body_html: str | None = None,
    tags: dict | None = None,
) -> dict:
    """Send a transactional email via Resend.

    Returns {"provider_message_id": str, "status": "sent"} on success.
    Raises ValueError with a generic message on failure.
    """
    if not is_configured():
        raise ValueError("Resend is not configured")

    try:
        import resend
    except ImportError as e:
        raise ValueError("Resend SDK not installed") from e

    resend.api_key = settings.RESEND_API_KEY

    payload: dict = {
        "from": settings.RESEND_FROM_EMAIL,
        "to": [to],
        "subject": subject,
        "text": body_text,
    }
    if body_html:
        payload["html"] = body_html
    if tags:
        payload["tags"] = [{"name": k, "value": str(v)} for k, v in tags.items()]

    try:
        result = resend.Emails.send(payload)
    except Exception as e:
        logger.exception("Resend send failed for %s", to)
        raise ValueError("Email send failed. Please try again later.") from e

    message_id = result.get("id") if isinstance(result, dict) else None
    if not message_id:
        raise ValueError("Email send failed. Please try again later.")

    return {"provider_message_id": message_id, "status": "sent"}

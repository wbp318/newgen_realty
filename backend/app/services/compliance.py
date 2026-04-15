"""TCPA compliance service.

Enforces contact hours, validates outreach compliance, and processes opt-outs.
All functions are sync for consistency with other services.
"""

from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo


def check_contact_hours(tz_name: str = "America/Chicago") -> bool:
    """Check if current time is within 8am-9pm in recipient's timezone.

    Returns True if contact is allowed, False if outside hours.
    """
    try:
        tz = ZoneInfo(tz_name)
    except (KeyError, ValueError):
        tz = ZoneInfo("America/Chicago")

    now = datetime.now(tz)
    return 8 <= now.hour < 21


def validate_outreach_compliance(prospect: dict) -> list[str]:
    """Return list of compliance flags/warnings for a prospect.

    Checks:
    - Consent status (must be 'granted' for phone/text)
    - DNC list status
    - Contact hours
    - Opt-out processing window (10 business days)
    - Do-not-contact status
    - Contact info availability
    """
    flags = []

    # Consent check
    consent = prospect.get("consent_status", "none")
    if consent not in ("granted",):
        flags.append("no_consent")

    # DNC check
    if prospect.get("dnc_listed", False):
        flags.append("on_dnc_list")

    # Opt-out processing window
    opt_out_date = prospect.get("opt_out_date")
    if opt_out_date and not prospect.get("opt_out_processed"):
        flags.append("pending_opt_out")

    # Do not contact status
    if prospect.get("status") == "do_not_contact":
        flags.append("do_not_contact")

    # No contact info
    if not prospect.get("email") and not prospect.get("phone") and not prospect.get("mailing_address"):
        flags.append("no_contact_info")

    # Contact hours (only flag if we know their timezone)
    tz = prospect.get("contact_window_timezone", "America/Chicago")
    if not check_contact_hours(tz):
        flags.append("outside_contact_hours")

    return flags


def process_opt_out(opt_out_date_str: str | None) -> dict:
    """Calculate opt-out processing status.

    FCC requires opt-outs processed within 10 business days.

    Returns:
        dict with: is_processed, days_remaining, deadline
    """
    if not opt_out_date_str:
        return {"is_processed": True, "days_remaining": 0, "deadline": None}

    try:
        opt_out_date = datetime.fromisoformat(opt_out_date_str.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return {"is_processed": True, "days_remaining": 0, "deadline": None}

    # Calculate 10 business days from opt-out date
    deadline = opt_out_date
    business_days_added = 0
    while business_days_added < 10:
        deadline += timedelta(days=1)
        if deadline.weekday() < 5:  # Monday=0 through Friday=4
            business_days_added += 1

    now = datetime.now(opt_out_date.tzinfo) if opt_out_date.tzinfo else datetime.utcnow()
    is_processed = now >= deadline
    days_remaining = max(0, (deadline - now).days) if not is_processed else 0

    return {
        "is_processed": is_processed,
        "days_remaining": days_remaining,
        "deadline": deadline.isoformat(),
    }


def can_contact_via_medium(prospect: dict, medium: str) -> dict:
    """Check if a prospect can be contacted via a specific medium.

    Returns dict with: allowed (bool), reasons (list of why not)
    """
    reasons = []

    # Letters don't require consent (First Amendment) but respect DNC and opt-out
    if medium in ("email", "text", "phone"):
        if prospect.get("consent_status") != "granted":
            reasons.append(f"{medium} requires written consent (TCPA)")

    if prospect.get("dnc_listed") and medium in ("phone", "text"):
        reasons.append("On Do Not Call list")

    if prospect.get("status") == "do_not_contact":
        reasons.append("Marked as Do Not Contact")

    if prospect.get("opt_out_date") and not prospect.get("opt_out_processed"):
        reasons.append("Opt-out pending processing")

    # Check contact info exists for medium
    if medium == "email" and not prospect.get("email"):
        reasons.append("No email address on file")
    elif medium in ("phone", "text") and not prospect.get("phone"):
        reasons.append("No phone number on file")
    elif medium == "letter" and not prospect.get("mailing_address"):
        reasons.append("No mailing address on file")

    # Check contact hours for phone/text
    if medium in ("phone", "text"):
        tz = prospect.get("contact_window_timezone", "America/Chicago")
        if not check_contact_hours(tz):
            reasons.append("Outside allowed contact hours (8am-9pm recipient time)")

    return {"allowed": len(reasons) == 0, "reasons": reasons}

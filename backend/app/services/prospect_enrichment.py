"""Prospect enrichment and compliance service.

Cross-references ATTOM data and checks compliance status.
Sync functions — FastAPI runs in threadpool from async endpoints.
"""

from app.services import prospect_data


def enrich_prospect_data(prospect: dict) -> dict:
    """Cross-reference ATTOM data to fill in missing fields.

    Returns a dict with updated property_data and owner_data.
    """
    address = prospect.get("property_address", "")
    if not address or not prospect_data.is_configured():
        return {}

    result = {}

    try:
        enrichment = prospect_data.enrich_property(address)
        if enrichment:
            result.update(enrichment)
    except Exception:
        pass

    try:
        avm = prospect_data.get_avm(address)
        if avm:
            if "property_data" not in result:
                result["property_data"] = {}
            result["property_data"].update(avm)
    except Exception:
        pass

    return result


def check_dnc_list(phone: str) -> bool:
    """Check if a phone number is on the Do Not Call list.

    Returns True if the number IS on the DNC list (do not contact).
    Phase 1: Stub that returns False.
    Phase 2: Integrate with FTC DNC API or third-party service.
    """
    if not phone:
        return False
    # TODO: Integrate with DNC registry API
    return False


def determine_timezone(state: str, zip_code: str | None = None) -> str:
    """Determine the timezone for contact hour compliance.

    LA, AR, MS are all Central Time. Edge cases handled if needed.
    """
    # All three supported states are Central Time
    return "America/Chicago"


def validate_outreach_compliance(prospect: dict) -> list[str]:
    """Return list of compliance flags/warnings for a prospect.

    Checks consent status, DNC list, and basic compliance rules.
    """
    flags = []

    consent = prospect.get("consent_status", "none")
    if consent not in ("granted",):
        flags.append("no_consent")

    if prospect.get("dnc_listed", False):
        flags.append("on_dnc_list")

    if prospect.get("opt_out_date") and not prospect.get("opt_out_processed"):
        flags.append("pending_opt_out")

    if prospect.get("status") == "do_not_contact":
        flags.append("do_not_contact")

    if not prospect.get("email") and not prospect.get("phone") and not prospect.get("mailing_address"):
        flags.append("no_contact_info")

    return flags

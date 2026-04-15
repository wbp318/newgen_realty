"""AI outreach message generation service.

Generates personalized outreach messages (email, letter, text) for prospects.
Sync function — FastAPI runs in threadpool from async endpoints.
"""

import re

from app.config import settings
from app.prompts.system_prompts import OUTREACH_SYSTEM, CAMPAIGN_INSIGHTS_SYSTEM
from app.prompts.templates import (
    OUTREACH_TEMPLATE,
    OUTREACH_MEDIUM_INSTRUCTIONS,
    CAMPAIGN_INSIGHTS_TEMPLATE,
)
from app.services.ai_assistant import assistant


PROSPECT_TYPE_CONTEXT = {
    "absentee_owner": "This owner lives at a different address than the property. They may be a landlord tired of managing a rental, or someone who inherited and never moved in. Focus on the hassle-free aspect of selling.",
    "pre_foreclosure": "This owner has received a notice of default. They are likely under financial stress. Be empathetic — never use the word 'foreclosure' in your message. Offer options and help.",
    "probate": "This property is part of an estate or succession. The owner likely inherited it and may be dealing with grief. Be sensitive, acknowledge the situation, and offer to simplify the process.",
    "long_term_owner": "This owner has held the property for many years and has likely built significant equity. They may not know the current market value. Congratulate them on their investment and mention timing.",
    "tax_delinquent": "This owner has delinquent property taxes. They may be experiencing financial difficulty. Be helpful, not predatory. Mention that selling could resolve the tax situation.",
    "vacant": "This property appears to be unoccupied. The owner is carrying costs (taxes, insurance, maintenance) with no benefit. Mention the financial burden and the opportunity to convert to cash.",
    "fsbo": "This owner is trying to sell without an agent. Respect their effort but offer the value of professional representation — broader exposure, negotiation expertise, and transaction management.",
    "expired_listing": "This property was previously listed but didn't sell. The owner may be frustrated with their previous agent. Offer a fresh approach and explain what you'd do differently.",
}


def generate_outreach_message(
    prospect_data: dict,
    medium: str = "email",
    tone: str = "professional",
    campaign_context: str = "",
) -> dict:
    """Generate a personalized outreach message for a prospect."""
    pd = prospect_data.get("property_data", {}) or {}
    ms = prospect_data.get("motivation_signals", {}) or {}
    prospect_type = prospect_data.get("prospect_type", "unknown")

    # Determine key signal
    key_signal = _determine_key_signal(prospect_type, ms)

    # Estimated value
    avm = pd.get("avm_value") or pd.get("market_value") or pd.get("assessed_value")
    estimated_value = f"${avm:,}" if avm and isinstance(avm, (int, float)) else "Unknown"

    # Equity position
    if avm and pd.get("last_sale_price") and isinstance(avm, (int, float)) and isinstance(pd["last_sale_price"], (int, float)):
        equity = avm - pd["last_sale_price"]
        equity_position = f"~${equity:,} in estimated equity"
    else:
        equity_position = "Equity position unknown"

    # Context from type + campaign
    type_context = PROSPECT_TYPE_CONTEXT.get(prospect_type, "")
    context = type_context
    if campaign_context:
        context += f"\n\nCampaign notes: {campaign_context}"

    medium_instructions = OUTREACH_MEDIUM_INSTRUCTIONS.get(medium, OUTREACH_MEDIUM_INSTRUCTIONS["email"])

    prompt = OUTREACH_TEMPLATE.format(
        medium=medium,
        owner_name=_format_name(prospect_data),
        prospect_type=prospect_type.replace("_", " "),
        property_address=prospect_data.get("property_address", ""),
        property_city=prospect_data.get("property_city", ""),
        property_state=prospect_data.get("property_state", "LA"),
        key_signal=key_signal,
        estimated_value=estimated_value,
        ownership_years=ms.get("ownership_years", "Unknown"),
        equity_position=equity_position,
        context=context,
        tone=tone,
        medium_instructions=medium_instructions,
    )

    response = assistant.chat(
        [{"role": "user", "content": prompt}],
        system=OUTREACH_SYSTEM,
        max_tokens=settings.MAX_TOKENS_OUTREACH,
    )

    return _parse_outreach_response(response, medium)


def generate_campaign_insights(campaign_data: dict, messages: list[dict]) -> dict:
    """Analyze campaign performance and generate AI insights."""
    total = campaign_data.get("total_messages", 0)
    sent = campaign_data.get("sent_count", 0)
    delivered = campaign_data.get("delivered_count", 0)
    opened = campaign_data.get("opened_count", 0)
    replied = campaign_data.get("replied_count", 0)

    open_rate = round((opened / sent * 100), 1) if sent > 0 else 0
    reply_rate = round((replied / sent * 100), 1) if sent > 0 else 0

    # Build type breakdown
    type_counts: dict[str, int] = {}
    medium_counts: dict[str, int] = {}
    for msg in messages:
        pt = msg.get("prospect_type", "unknown")
        type_counts[pt] = type_counts.get(pt, 0) + 1
        md = msg.get("medium", "unknown")
        medium_counts[md] = medium_counts.get(md, 0) + 1

    type_breakdown = "\n".join(f"- {t}: {c} messages" for t, c in type_counts.items()) or "No data"
    medium_breakdown = "\n".join(f"- {m}: {c} messages" for m, c in medium_counts.items()) or "No data"

    prompt = CAMPAIGN_INSIGHTS_TEMPLATE.format(
        campaign_name=campaign_data.get("name", "Unnamed"),
        campaign_type=campaign_data.get("campaign_type", "email"),
        campaign_status=campaign_data.get("status", "active"),
        total_messages=total,
        sent_count=sent,
        delivered_count=delivered,
        opened_count=opened,
        open_rate=open_rate,
        replied_count=replied,
        reply_rate=reply_rate,
        type_breakdown=type_breakdown,
        medium_breakdown=medium_breakdown,
    )

    response = assistant.chat(
        [{"role": "user", "content": prompt}],
        system=CAMPAIGN_INSIGHTS_SYSTEM,
        max_tokens=settings.MAX_TOKENS_CAMPAIGN_INSIGHTS,
    )

    return _parse_insights_response(response, campaign_data)


def _format_name(data: dict) -> str:
    first = data.get("first_name", "")
    last = data.get("last_name", "")
    name = f"{first} {last}".strip()
    return name if name else "Property Owner"


def _determine_key_signal(prospect_type: str, signals: dict) -> str:
    if prospect_type == "absentee_owner":
        return "Owner lives at a different address than the property"
    elif prospect_type == "pre_foreclosure":
        status = signals.get("foreclosure_status", "")
        return f"Notice of Default filed{f' — {status}' if status else ''}"
    elif prospect_type == "long_term_owner":
        years = signals.get("ownership_years", "10+")
        return f"Has owned the property for {years} years"
    elif prospect_type == "tax_delinquent":
        amount = signals.get("tax_delinquent_amount", "")
        return f"Property taxes are delinquent{f' (${amount:,})' if amount and isinstance(amount, (int, float)) else ''}"
    elif prospect_type == "vacant":
        return "Property appears to be unoccupied"
    elif prospect_type == "probate":
        return "Property is part of an estate or succession"
    elif prospect_type == "fsbo":
        return "Currently listed For Sale By Owner"
    elif prospect_type == "expired_listing":
        return "Previous listing expired without selling"
    return "Potential seller identified through public records"


def _parse_outreach_response(response: str, medium: str) -> dict:
    subject = None
    body = response

    if medium == "email":
        subject_match = re.search(r"SUBJECT:\s*(.+?)(?:\n|$)", response)
        if subject_match:
            subject = subject_match.group(1).strip()

    body_match = re.search(r"BODY:\s*(.+)", response, re.DOTALL)
    if body_match:
        body = body_match.group(1).strip()

    return {"subject": subject, "body": body}


def _parse_insights_response(response: str, campaign_data: dict) -> dict:
    suggestions = []
    top_types = []

    # Extract suggestions
    suggestions_match = re.search(r"SUGGESTIONS:\s*\n((?:- .+\n?)+)", response)
    if suggestions_match:
        suggestions = [s.strip() for s in re.findall(r"- (.+)", suggestions_match.group(1))]

    return {
        "campaign_id": campaign_data.get("id", ""),
        "total_sent": campaign_data.get("sent_count", 0),
        "response_rate": round((campaign_data.get("replied_count", 0) / max(campaign_data.get("sent_count", 1), 1)) * 100, 1),
        "top_performing_prospect_types": top_types,
        "suggestions": suggestions,
        "raw_analysis": response,
    }

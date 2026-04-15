"""AI prospect scoring service.

Scores prospects 0-100 based on motivation signals using Claude.
Sync function — FastAPI runs in threadpool from async endpoints.
"""

import re

from app.config import settings
from app.prompts.system_prompts import PROSPECT_SCORING_SYSTEM
from app.prompts.templates import PROSPECT_SCORING_TEMPLATE
from app.services.ai_assistant import assistant


def score_prospect(prospect_data: dict, market_context: str = "") -> dict:
    """Score a prospect 0-100 using Claude based on motivation signals."""
    pd = prospect_data.get("property_data", {}) or {}
    ms = prospect_data.get("motivation_signals", {}) or {}

    # Build signals summary
    signals = []
    for key, value in ms.items():
        if value is True:
            signals.append(key.replace("_", " "))
        elif isinstance(value, (int, float)) and value > 0:
            signals.append(f"{key.replace('_', ' ')}: {value}")
        elif isinstance(value, str) and value:
            signals.append(f"{key.replace('_', ' ')}: {value}")
    signals_summary = ", ".join(signals) if signals else "No specific signals recorded"

    # Determine parish/county label
    state = prospect_data.get("property_state", "LA")
    county_parish_label = "Parish" if state == "LA" else "County"

    # Estimated equity
    avm = pd.get("avm_value")
    last_price = pd.get("last_sale_price")
    if avm and last_price and isinstance(avm, (int, float)) and isinstance(last_price, (int, float)):
        equity = avm - last_price
        equity_pct = round((equity / avm) * 100) if avm > 0 else 0
        estimated_equity = f"~${equity:,} ({equity_pct}%)"
    else:
        estimated_equity = "Unknown"

    prompt = PROSPECT_SCORING_TEMPLATE.format(
        property_address=prospect_data.get("property_address", "Unknown"),
        property_city=prospect_data.get("property_city", "Unknown"),
        county_parish_label=county_parish_label,
        property_parish=prospect_data.get("property_parish", "Unknown"),
        property_state=state,
        year_built=pd.get("year_built", "Unknown"),
        sqft=pd.get("sqft", "Unknown"),
        bedrooms=pd.get("bedrooms", "Unknown"),
        bathrooms=pd.get("bathrooms", "Unknown"),
        owner_name=_format_name(prospect_data),
        mailing_address=prospect_data.get("mailing_address", "Unknown"),
        ownership_years=ms.get("ownership_years", "Unknown"),
        last_sale_price=f"${last_price:,}" if last_price else "Unknown",
        last_sale_date=pd.get("last_sale_date", "Unknown"),
        assessed_value=f"${pd['assessed_value']:,}" if pd.get("assessed_value") else "Unknown",
        avm_value=f"${avm:,}" if avm else "Unknown",
        estimated_equity=estimated_equity,
        prospect_type=prospect_data.get("prospect_type", "unknown").replace("_", " "),
        signals_summary=signals_summary,
        market_context=market_context or "No additional market context available.",
    )

    response = assistant.chat(
        [{"role": "user", "content": prompt}],
        system=PROSPECT_SCORING_SYSTEM,
        max_tokens=settings.MAX_TOKENS_PROSPECT_SCORE,
    )

    return _parse_score_response(response)


def _format_name(data: dict) -> str:
    first = data.get("first_name", "")
    last = data.get("last_name", "")
    name = f"{first} {last}".strip()
    return name if name else "Unknown Owner"


def _parse_score_response(response: str) -> dict:
    score = 50
    motivation = "medium"
    reason = response
    approach = None
    outreach_type = None

    score_match = re.search(r"SCORE:\s*(\d+)", response)
    if score_match:
        score = min(100, max(0, int(score_match.group(1))))

    motivation_match = re.search(r"MOTIVATION:\s*(high|medium|low)", response, re.IGNORECASE)
    if motivation_match:
        motivation = motivation_match.group(1).lower()

    reason_match = re.search(r"REASON:\s*(.+?)(?=APPROACH:|OUTREACH_TYPE:|$)", response, re.DOTALL)
    if reason_match:
        reason = reason_match.group(1).strip()

    approach_match = re.search(r"APPROACH:\s*(.+?)(?=OUTREACH_TYPE:|$)", response, re.DOTALL)
    if approach_match:
        approach = approach_match.group(1).strip()

    outreach_match = re.search(r"OUTREACH_TYPE:\s*(\w+)", response)
    if outreach_match:
        outreach_type = outreach_match.group(1).strip().lower()

    return {
        "score": score,
        "motivation_level": motivation,
        "reason": reason,
        "suggested_approach": approach,
        "suggested_outreach_type": outreach_type,
    }

import json
import re

from app.config import settings
from app.prompts.system_prompts import LEAD_SCORING_SYSTEM
from app.prompts.templates import LEAD_SCORING_TEMPLATE
from app.services.ai_assistant import assistant


def score_lead(contact_data: dict, properties: list[dict], activities: list[dict]) -> dict:
    """Score a lead 0-100 using Claude based on their profile, available inventory, and activity."""
    prompt = LEAD_SCORING_TEMPLATE.format(
        contact_name=f"{contact_data.get('first_name', '')} {contact_data.get('last_name', '')}",
        contact_type=contact_data.get("contact_type", "lead"),
        budget_min=contact_data.get("budget_min", "N/A"),
        budget_max=contact_data.get("budget_max", "N/A"),
        preferred_parishes=", ".join(contact_data.get("preferred_parishes", []) or []) or "None specified",
        preferred_property_types=", ".join(contact_data.get("preferred_property_types", []) or []) or "None specified",
        preferred_cities=", ".join(contact_data.get("preferred_cities", []) or []) or "None specified",
        source=contact_data.get("source", "Unknown"),
        last_contact_date=str(contact_data.get("last_contact_date", "Never")),
        num_activities=len(activities),
        recent_activities=_format_activities(activities[:5]),
        num_matching_properties=len(properties),
        matching_properties_summary=_format_properties_brief(properties[:10]),
    )

    response = assistant.chat(
        [{"role": "user", "content": prompt}],
        system=LEAD_SCORING_SYSTEM,
        max_tokens=settings.MAX_TOKENS_ANALYSIS,
    )

    return _parse_score_response(response)


def _format_activities(activities: list[dict]) -> str:
    if not activities:
        return "No recent activity"
    lines = []
    for a in activities:
        lines.append(f"- [{a.get('activity_type', 'note')}] {a.get('title', '')} ({a.get('created_at', 'unknown date')})")
    return "\n".join(lines)


def _format_properties_brief(properties: list[dict]) -> str:
    if not properties:
        return "No matching properties in inventory"
    lines = []
    for p in properties:
        price = f"${p.get('asking_price', 0):,}" if p.get("asking_price") else "Price TBD"
        lines.append(f"- {p.get('street_address', 'Unknown')}, {p.get('city', '')}, {p.get('parish', '')} Parish — {price}")
    return "\n".join(lines)


def _parse_score_response(response: str) -> dict:
    score = 50
    reason = response

    score_match = re.search(r"SCORE:\s*(\d+)", response)
    if score_match:
        score = min(100, max(0, int(score_match.group(1))))

    reason_match = re.search(r"REASON:\s*(.+?)(?:ACTION:|$)", response, re.DOTALL)
    if reason_match:
        reason = reason_match.group(1).strip()

    action_match = re.search(r"ACTION:\s*(.+)", response, re.DOTALL)
    action = action_match.group(1).strip() if action_match else None

    return {"score": score, "reason": reason, "suggested_action": action}

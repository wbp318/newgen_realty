import json
import re

from app.config import settings
from app.prompts.system_prompts import PROPERTY_MATCHING_SYSTEM
from app.prompts.templates import PROPERTY_MATCHING_TEMPLATE
from app.services.ai_assistant import assistant


def match_properties(contact_data: dict, properties: list[dict]) -> list[dict]:
    """Match a contact to properties using Claude, returning ranked matches with reasons."""
    prompt = PROPERTY_MATCHING_TEMPLATE.format(
        contact_name=f"{contact_data.get('first_name', '')} {contact_data.get('last_name', '')}",
        contact_type=contact_data.get("contact_type", "lead"),
        budget_min=contact_data.get("budget_min", "N/A"),
        budget_max=contact_data.get("budget_max", "N/A"),
        preferred_parishes=", ".join(contact_data.get("preferred_parishes", []) or []) or "Any",
        preferred_property_types=", ".join(contact_data.get("preferred_property_types", []) or []) or "Any",
        preferred_cities=", ".join(contact_data.get("preferred_cities", []) or []) or "Any",
        notes=contact_data.get("notes", "None"),
        properties=_format_properties(properties),
    )

    response = assistant.chat(
        [{"role": "user", "content": prompt}],
        system=PROPERTY_MATCHING_SYSTEM,
        max_tokens=settings.MAX_TOKENS_ANALYSIS,
    )

    return _parse_matches(response, properties)


def _format_properties(properties: list[dict]) -> str:
    if not properties:
        return "No available properties"
    lines = []
    for i, p in enumerate(properties, 1):
        price = f"${p.get('asking_price', 0):,}" if p.get("asking_price") else "Price TBD"
        lines.append(
            f"#{i} [ID: {p.get('id', '')}]\n"
            f"  Address: {p.get('street_address', '')}, {p.get('city', '')}, {p.get('parish', '')} Parish\n"
            f"  Type: {p.get('property_type', 'N/A')} | Price: {price}\n"
            f"  Beds: {p.get('bedrooms', 'N/A')} | Baths: {p.get('bathrooms', 'N/A')} | SqFt: {p.get('sqft', 'N/A')}"
        )
    return "\n".join(lines)


def _parse_matches(response: str, properties: list[dict]) -> list[dict]:
    """Parse AI response into structured match list."""
    matches = []
    # Look for MATCH blocks
    match_blocks = re.findall(
        r"MATCH:\s*(\S+)\s*\nSCORE:\s*(\d+)\s*\nREASON:\s*(.+?)(?=MATCH:|$)",
        response,
        re.DOTALL,
    )

    prop_lookup = {p["id"]: p for p in properties}

    for prop_id, score, reason in match_blocks:
        prop_id = prop_id.strip()
        if prop_id in prop_lookup:
            matches.append({
                "property_id": prop_id,
                "match_score": min(100, max(0, int(score))),
                "reason": reason.strip(),
                "property": prop_lookup[prop_id],
            })

    # Sort by match_score descending
    matches.sort(key=lambda m: m["match_score"], reverse=True)
    return matches

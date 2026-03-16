import re

from app.config import settings
from app.prompts.system_prompts import LISTING_DESCRIPTION_SYSTEM
from app.prompts.templates import LISTING_DESCRIPTION_TEMPLATE
from app.schemas.ai import ListingRequest, ListingResponse
from app.services.ai_assistant import assistant


def generate_listing(data: ListingRequest) -> ListingResponse:
    prompt = LISTING_DESCRIPTION_TEMPLATE.format(
        street_address=data.street_address,
        city=data.city,
        parish=data.parish,
        property_type=data.property_type,
        bedrooms=data.bedrooms or "N/A",
        bathrooms=data.bathrooms or "N/A",
        sqft=data.sqft or "N/A",
        lot_size_acres=data.lot_size_acres or "N/A",
        year_built=data.year_built or "N/A",
        asking_price=data.asking_price or 0,
        features=data.features or "None specified",
        notes=data.notes or "None",
        tone=data.tone,
    )

    response = assistant.chat(
        messages=[{"role": "user", "content": prompt}],
        system=LISTING_DESCRIPTION_SYSTEM,
        max_tokens=settings.MAX_TOKENS_LISTING,
    )

    headline = ""
    description = response

    headline_match = re.search(r"HEADLINE:\s*(.+?)(?:\n|$)", response)
    desc_match = re.search(r"DESCRIPTION:\s*(.+)", response, re.DOTALL)

    if headline_match:
        headline = headline_match.group(1).strip()
    if desc_match:
        description = desc_match.group(1).strip()

    return ListingResponse(headline=headline, description=description)

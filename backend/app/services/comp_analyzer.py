import re

from app.config import settings
from app.prompts.system_prompts import COMP_ANALYSIS_SYSTEM
from app.prompts.templates import COMP_ANALYSIS_TEMPLATE
from app.schemas.ai import CompAnalysisRequest, CompAnalysisResponse
from app.services.ai_assistant import assistant


def analyze_comps(data: CompAnalysisRequest) -> CompAnalysisResponse:
    comp_details = ""
    for i, comp in enumerate(data.comps, 1):
        comp_details += f"\n### Comp {i}\n"
        comp_details += f"- Address: {comp.address}\n"
        comp_details += f"- Sale Price: ${comp.sale_price:,}\n"
        if comp.sqft:
            comp_details += f"- Square Feet: {comp.sqft}\n"
        if comp.bedrooms:
            comp_details += f"- Bedrooms: {comp.bedrooms}\n"
        if comp.bathrooms:
            comp_details += f"- Bathrooms: {comp.bathrooms}\n"
        if comp.sale_date:
            comp_details += f"- Sale Date: {comp.sale_date}\n"
        if comp.notes:
            comp_details += f"- Notes: {comp.notes}\n"

    prompt = COMP_ANALYSIS_TEMPLATE.format(
        subject_address=data.subject_address,
        subject_sqft=data.subject_sqft or "Unknown",
        subject_bedrooms=data.subject_bedrooms or "Unknown",
        subject_bathrooms=data.subject_bathrooms or "Unknown",
        subject_lot_acres=data.subject_lot_acres or "Unknown",
        subject_year_built=data.subject_year_built or "Unknown",
        subject_features=data.subject_features or "None specified",
        comp_details=comp_details,
    )

    response = assistant.chat(
        messages=[{"role": "user", "content": prompt}],
        system=COMP_ANALYSIS_SYSTEM,
        max_tokens=settings.MAX_TOKENS_ANALYSIS,
    )

    suggested = _extract_int(r"SUGGESTED_PRICE:\s*(\d[\d,]*)", response)
    low = _extract_int(r"PRICE_RANGE_LOW:\s*(\d[\d,]*)", response)
    high = _extract_int(r"PRICE_RANGE_HIGH:\s*(\d[\d,]*)", response)

    analysis_match = re.search(r"ANALYSIS:\s*(.+)", response, re.DOTALL)
    analysis = analysis_match.group(1).strip() if analysis_match else response

    return CompAnalysisResponse(
        suggested_price=suggested,
        price_range_low=low,
        price_range_high=high,
        analysis=analysis,
    )


def _extract_int(pattern: str, text: str) -> int:
    match = re.search(pattern, text)
    if match:
        return int(match.group(1).replace(",", ""))
    return 0

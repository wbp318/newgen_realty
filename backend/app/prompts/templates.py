LISTING_DESCRIPTION_TEMPLATE = """Generate a compelling MLS listing description for this Louisiana property:

**Address:** {street_address}, {city}, {parish} Parish, LA
**Property Type:** {property_type}
**Bedrooms:** {bedrooms}
**Bathrooms:** {bathrooms}
**Square Feet:** {sqft}
**Lot Size:** {lot_size_acres} acres
**Year Built:** {year_built}
**Asking Price:** ${asking_price:,}

**Features:** {features}

**Additional Notes:** {notes}

**Tone:** {tone}

Please provide:
1. A short, attention-grabbing headline (under 10 words)
2. A full listing description (150-300 words)

Format your response as:
HEADLINE: [your headline]
DESCRIPTION: [your description]
"""

COMP_ANALYSIS_TEMPLATE = """Analyze these comparable sales and recommend a listing price for the subject property.

## Subject Property
- Address: {subject_address}
- Square Feet: {subject_sqft}
- Bedrooms: {subject_bedrooms}
- Bathrooms: {subject_bathrooms}
- Lot Size: {subject_lot_acres} acres
- Year Built: {subject_year_built}
- Features: {subject_features}

## Comparable Sales
{comp_details}

Provide your analysis with:
1. Suggested listing price (single integer)
2. Price range low (integer)
3. Price range high (integer)
4. Detailed analysis explaining your reasoning

Format your response as:
SUGGESTED_PRICE: [integer]
PRICE_RANGE_LOW: [integer]
PRICE_RANGE_HIGH: [integer]
ANALYSIS: [your detailed analysis]
"""

COMM_DRAFT_TEMPLATE = """Draft a {medium} for a Louisiana real estate agent.

**Recipient:** {recipient_name}
**Purpose:** {purpose}
**Context:** {context}
**Tone:** {tone}

{medium_instructions}
"""

MEDIUM_INSTRUCTIONS = {
    "email": "Provide a subject line and email body. Format as:\nSUBJECT: [subject]\nBODY: [email body]",
    "text": "Provide a text message. Keep it concise (under 300 characters if possible). Format as:\nBODY: [text message]",
}

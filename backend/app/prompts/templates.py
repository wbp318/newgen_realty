LISTING_DESCRIPTION_TEMPLATE = """Generate a compelling MLS listing description for this property:

**Address:** {street_address}, {city}, {county_parish_label}: {county_parish}, {state}
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

COMM_DRAFT_TEMPLATE = """Draft a {medium} for a real estate agent.

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

LEAD_SCORING_TEMPLATE = """Score this real estate lead from 0-100 based on their likelihood to transact.

## Contact Profile
- **Name:** {contact_name}
- **Type:** {contact_type}
- **Budget:** {budget_min} - {budget_max}
- **Preferred Parishes/Counties:** {preferred_parishes}
- **Preferred Property Types:** {preferred_property_types}
- **Preferred Cities:** {preferred_cities}
- **Source:** {source}
- **Last Contact Date:** {last_contact_date}

## Activity History
- Total activities: {num_activities}
- Recent activity:
{recent_activities}

## Available Inventory Match
- Properties matching preferences: {num_matching_properties}
{matching_properties_summary}

Score this lead and explain your reasoning. Format as:
SCORE: [integer 0-100]
REASON: [2-3 sentence explanation]
ACTION: [specific next step]
"""

PROPERTY_MATCHING_TEMPLATE = """Match this contact to the best available properties.

## Contact Profile
- **Name:** {contact_name}
- **Type:** {contact_type}
- **Budget:** {budget_min} - {budget_max}
- **Preferred Parishes/Counties:** {preferred_parishes}
- **Preferred Property Types:** {preferred_property_types}
- **Preferred Cities:** {preferred_cities}
- **Notes:** {notes}

## Available Properties
{properties}

For each property that could be a match (score 30+), provide:
MATCH: [property_id]
SCORE: [0-100]
REASON: [why this matches or doesn't match well]
"""

PROSPECT_SCORING_TEMPLATE = """Score this real estate prospect from 0-100 based on their likelihood of selling.

## Property
- Address: {property_address}
- City: {property_city}, {county_parish_label}: {property_parish}, {property_state}
- Year Built: {year_built}
- SqFt: {sqft}
- Bedrooms/Bathrooms: {bedrooms}/{bathrooms}

## Owner
- Name: {owner_name}
- Mailing Address: {mailing_address}
- Ownership Duration: {ownership_years} years
- Last Sale Price: {last_sale_price}
- Last Sale Date: {last_sale_date}

## Valuation
- Assessed Value: {assessed_value}
- Estimated Market Value (AVM): {avm_value}
- Estimated Equity: {estimated_equity}

## Motivation Signals
- Prospect Type: {prospect_type}
- Signals: {signals_summary}

## Local Market Context
{market_context}

Score this prospect and explain your reasoning.
"""

OUTREACH_TEMPLATE = """Draft a {medium} for a real estate agent reaching out to a property owner.

## Prospect Profile
- **Owner Name:** {owner_name}
- **Prospect Type:** {prospect_type}
- **Property Address:** {property_address}, {property_city}, {property_state}
- **Key Motivation Signal:** {key_signal}

## Property Details
- Estimated Value: {estimated_value}
- Ownership Duration: {ownership_years} years
- Equity Position: {equity_position}

## Context
{context}

## Instructions
- Tone: {tone}
- Medium: {medium}
{medium_instructions}
"""

OUTREACH_MEDIUM_INSTRUCTIONS = {
    "email": "Provide a subject line and email body. Format as:\nSUBJECT: [subject]\nBODY: [email body]",
    "text": "Provide a text message. Keep under 300 characters. Format as:\nBODY: [text message]",
    "letter": "Provide a full letter. Include greeting and sign-off. Format as:\nBODY: [full letter text]",
}

CAMPAIGN_INSIGHTS_TEMPLATE = """Analyze this outreach campaign and provide optimization suggestions.

## Campaign: {campaign_name}
- Type: {campaign_type}
- Status: {campaign_status}

## Metrics
- Total Messages: {total_messages}
- Sent: {sent_count}
- Delivered: {delivered_count}
- Opened: {opened_count} ({open_rate}%)
- Replied: {replied_count} ({reply_rate}%)

## Breakdown by Prospect Type
{type_breakdown}

## Breakdown by Medium
{medium_breakdown}

Analyze performance and provide actionable suggestions.
"""

DASHBOARD_INSIGHTS_TEMPLATE = """Analyze this real estate portfolio and generate actionable insights.

## Portfolio Summary
- Total properties: {num_properties}
- Active listings: {num_active}
- Total contacts: {num_contacts}
- Active leads: {num_leads}
- Total portfolio value: ${portfolio_value:,}

## Properties by State
{properties_by_state}

## Properties by Parish/County
{properties_by_parish}

## Properties by Status
{properties_by_status}

## Price Distribution
{price_distribution}

## Recent Activity ({num_recent_activities} in last 7 days)
{recent_activity_summary}

## Contact Preferences
{contact_preferences}

Analyze this data and provide specific, actionable insights. Reference actual parishes/counties, states, price ranges, and patterns.
"""

import re
import uuid
from collections import Counter
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.activity import Activity
from app.models.contact import Contact
from app.models.conversation import Conversation
from app.models.property import Property
from app.schemas.ai import (
    ChatRequest, ChatResponse,
    CommDraftRequest, CommDraftResponse,
    CompAnalysisRequest, CompAnalysisResponse,
    DashboardInsightsResponse,
    LeadScoreRequest, LeadScoreResponse,
    ListingRequest, ListingResponse,
    PropertyMatchItem, PropertyMatchRequest, PropertyMatchResponse,
)
from app.schemas.ai import CompData
from app.schemas.market_data import AutoCompAnalysisRequest
from app.models.prospect import Prospect
from app.schemas.prospect import ProspectScoreRequest, ProspectScoreResponse, BulkScoreRequest, BulkScoreResponse
from app.services.ai_assistant import assistant
from app.services.comm_drafter import draft_communication
from app.services.comp_analyzer import analyze_comps
from app.services.lead_scorer import score_lead
from app.services.listing_generator import generate_listing
from app.services.property_matcher import match_properties
from app.services.prospect_scorer import score_prospect
from app.services import market_data
from app.prompts.system_prompts import DASHBOARD_INSIGHTS_SYSTEM
from app.prompts.templates import DASHBOARD_INSIGHTS_TEMPLATE
from app.config import settings

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, db: AsyncSession = Depends(get_db)):
    messages = [{"role": m.role, "content": m.content} for m in request.messages]
    response = assistant.chat(messages, model=settings.AI_MODEL_FAST)

    # Persist conversation
    conversation_id = request.conversation_id
    if conversation_id:
        result = await db.execute(
            select(Conversation).where(Conversation.id == conversation_id)
        )
        convo = result.scalar_one_or_none()
        if convo:
            convo.messages = messages + [{"role": "assistant", "content": response}]
            await db.commit()
        else:
            conversation_id = None

    if not conversation_id:
        conversation_id = str(uuid.uuid4())
        # Auto-title from first user message
        title = messages[0]["content"][:80] if messages else "New conversation"
        convo = Conversation(
            id=conversation_id,
            title=title,
            context_type="general",
            messages=messages + [{"role": "assistant", "content": response}],
        )
        db.add(convo)
        await db.commit()

    return ChatResponse(response=response, conversation_id=conversation_id)


@router.post("/generate-listing", response_model=ListingResponse)
def gen_listing(request: ListingRequest):
    return generate_listing(request)


@router.post("/analyze-comps", response_model=CompAnalysisResponse)
def comp_analysis(request: CompAnalysisRequest):
    return analyze_comps(request)


@router.post("/draft-communication", response_model=CommDraftResponse)
def comm_draft(request: CommDraftRequest):
    return draft_communication(request)


@router.post("/score-lead", response_model=LeadScoreResponse)
async def ai_score_lead(request: LeadScoreRequest, db: AsyncSession = Depends(get_db)):
    # Fetch contact
    result = await db.execute(select(Contact).where(Contact.id == request.contact_id))
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    contact_data = {
        "first_name": contact.first_name,
        "last_name": contact.last_name,
        "contact_type": contact.contact_type,
        "budget_min": contact.budget_min,
        "budget_max": contact.budget_max,
        "preferred_parishes": contact.preferred_parishes,
        "preferred_property_types": contact.preferred_property_types,
        "preferred_cities": contact.preferred_cities,
        "source": contact.source,
        "last_contact_date": str(contact.last_contact_date) if contact.last_contact_date else None,
    }

    # Fetch active properties
    props_result = await db.execute(
        select(Property).where(Property.status == "active")
    )
    properties = [
        {
            "id": p.id, "street_address": p.street_address, "city": p.city,
            "parish": p.parish, "property_type": p.property_type,
            "asking_price": p.asking_price, "bedrooms": p.bedrooms,
            "bathrooms": p.bathrooms, "sqft": p.sqft,
        }
        for p in props_result.scalars().all()
    ]

    # Fetch activities for this contact
    acts_result = await db.execute(
        select(Activity)
        .where(Activity.contact_id == request.contact_id)
        .order_by(Activity.created_at.desc())
        .limit(10)
    )
    activities = [
        {"activity_type": a.activity_type, "title": a.title, "created_at": str(a.created_at)}
        for a in acts_result.scalars().all()
    ]

    # Run scoring (sync — FastAPI runs in threadpool)
    score_result = score_lead(contact_data, properties, activities)

    # Update contact with score
    contact.ai_lead_score = score_result["score"]
    contact.ai_lead_score_reason = score_result["reason"]
    await db.commit()

    # Log as activity
    activity = Activity(
        activity_type="ai_action",
        title=f"AI Lead Score: {score_result['score']}/100",
        description=score_result["reason"],
        contact_id=request.contact_id,
    )
    db.add(activity)
    await db.commit()

    return LeadScoreResponse(
        contact_id=request.contact_id,
        score=score_result["score"],
        reason=score_result["reason"],
        suggested_action=score_result.get("suggested_action"),
    )


@router.post("/match-properties", response_model=PropertyMatchResponse)
async def ai_match_properties(request: PropertyMatchRequest, db: AsyncSession = Depends(get_db)):
    # Fetch contact
    result = await db.execute(select(Contact).where(Contact.id == request.contact_id))
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    contact_data = {
        "first_name": contact.first_name,
        "last_name": contact.last_name,
        "contact_type": contact.contact_type,
        "budget_min": contact.budget_min,
        "budget_max": contact.budget_max,
        "preferred_parishes": contact.preferred_parishes,
        "preferred_property_types": contact.preferred_property_types,
        "preferred_cities": contact.preferred_cities,
        "notes": contact.notes,
    }

    # Fetch active properties
    props_result = await db.execute(
        select(Property).where(Property.status.in_(["active", "pending"]))
    )
    properties = [
        {
            "id": p.id, "street_address": p.street_address, "city": p.city,
            "parish": p.parish, "property_type": p.property_type,
            "asking_price": p.asking_price, "bedrooms": p.bedrooms,
            "bathrooms": p.bathrooms, "sqft": p.sqft, "status": p.status,
        }
        for p in props_result.scalars().all()
    ]

    if not properties:
        return PropertyMatchResponse(contact_id=request.contact_id, matches=[])

    # Run matching (sync)
    matches = match_properties(contact_data, properties)

    # Log as activity
    activity = Activity(
        activity_type="ai_action",
        title=f"AI Property Matching: {len(matches)} matches found",
        contact_id=request.contact_id,
    )
    db.add(activity)
    await db.commit()

    return PropertyMatchResponse(
        contact_id=request.contact_id,
        matches=[
            PropertyMatchItem(
                property_id=m["property_id"],
                match_score=m["match_score"],
                reason=m["reason"],
            )
            for m in matches
        ],
    )


@router.post("/score-prospect", response_model=ProspectScoreResponse)
async def ai_score_prospect(request: ProspectScoreRequest, db: AsyncSession = Depends(get_db)):
    """AI-score a single prospect based on motivation signals."""
    result = await db.execute(select(Prospect).where(Prospect.id == request.prospect_id))
    prospect = result.scalar_one_or_none()
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")

    prospect_data = {
        "first_name": prospect.first_name,
        "last_name": prospect.last_name,
        "property_address": prospect.property_address,
        "property_city": prospect.property_city,
        "property_parish": prospect.property_parish,
        "property_state": prospect.property_state,
        "property_zip": prospect.property_zip,
        "prospect_type": prospect.prospect_type,
        "mailing_address": prospect.mailing_address,
        "property_data": prospect.property_data or {},
        "motivation_signals": prospect.motivation_signals or {},
    }

    # Run scoring (sync — FastAPI runs in threadpool)
    score_result = score_prospect(prospect_data)

    # Update prospect with score
    prospect.ai_prospect_score = score_result["score"]
    prospect.ai_prospect_score_reason = score_result["reason"]
    prospect.ai_scored_at = datetime.utcnow()
    await db.commit()

    # Log activity
    activity = Activity(
        activity_type="ai_action",
        title=f"AI Prospect Score: {score_result['score']}/100",
        description=score_result["reason"],
        prospect_id=request.prospect_id,
    )
    db.add(activity)
    await db.commit()

    return ProspectScoreResponse(
        prospect_id=request.prospect_id,
        score=score_result["score"],
        reason=score_result["reason"],
        motivation_level=score_result["motivation_level"],
        suggested_approach=score_result.get("suggested_approach"),
        suggested_outreach_type=score_result.get("suggested_outreach_type"),
    )


@router.post("/bulk-score-prospects", response_model=BulkScoreResponse)
async def ai_bulk_score_prospects(request: BulkScoreRequest, db: AsyncSession = Depends(get_db)):
    """AI-score multiple prospects."""
    results = []
    for prospect_id in request.prospect_ids:
        result = await db.execute(select(Prospect).where(Prospect.id == prospect_id))
        prospect = result.scalar_one_or_none()
        if not prospect:
            continue

        prospect_data = {
            "first_name": prospect.first_name,
            "last_name": prospect.last_name,
            "property_address": prospect.property_address,
            "property_city": prospect.property_city,
            "property_parish": prospect.property_parish,
            "property_state": prospect.property_state,
            "property_zip": prospect.property_zip,
            "prospect_type": prospect.prospect_type,
            "mailing_address": prospect.mailing_address,
            "property_data": prospect.property_data or {},
            "motivation_signals": prospect.motivation_signals or {},
        }

        score_result = score_prospect(prospect_data)

        prospect.ai_prospect_score = score_result["score"]
        prospect.ai_prospect_score_reason = score_result["reason"]
        prospect.ai_scored_at = datetime.utcnow()

        results.append(ProspectScoreResponse(
            prospect_id=prospect_id,
            score=score_result["score"],
            reason=score_result["reason"],
            motivation_level=score_result["motivation_level"],
            suggested_approach=score_result.get("suggested_approach"),
            suggested_outreach_type=score_result.get("suggested_outreach_type"),
        ))

    await db.commit()

    avg_score = sum(r.score for r in results) / len(results) if results else 0

    # Log activity
    activity = Activity(
        activity_type="ai_action",
        title=f"Bulk prospect scoring: {len(results)} scored, avg {avg_score:.0f}",
    )
    db.add(activity)
    await db.commit()

    return BulkScoreResponse(results=results, average_score=round(avg_score, 1))


@router.get("/dashboard-insights", response_model=DashboardInsightsResponse)
async def ai_dashboard_insights(db: AsyncSession = Depends(get_db)):
    # Gather all data
    props_result = await db.execute(select(Property))
    properties = props_result.scalars().all()

    contacts_result = await db.execute(select(Contact))
    contacts = contacts_result.scalars().all()

    week_ago = datetime.utcnow() - timedelta(days=7)
    acts_result = await db.execute(
        select(Activity).where(Activity.created_at >= week_ago).order_by(Activity.created_at.desc())
    )
    recent_activities = acts_result.scalars().all()

    # Build portfolio stats
    active_props = [p for p in properties if p.status == "active"]
    portfolio_value = sum(p.asking_price or 0 for p in active_props)
    leads = [c for c in contacts if c.contact_type in ("lead", "buyer")]

    # Properties by state
    state_counts = Counter(p.state or "LA" for p in properties)
    properties_by_state = "\n".join(f"- {state}: {count}" for state, count in state_counts.most_common()) or "None"

    # Properties by parish/county
    parish_counts = Counter(f"{p.parish} ({p.state or 'LA'})" for p in properties)
    properties_by_parish = "\n".join(f"- {parish}: {count}" for parish, count in parish_counts.most_common())

    # Properties by status
    status_counts = Counter(p.status for p in properties)
    properties_by_status = "\n".join(f"- {status}: {count}" for status, count in status_counts.most_common())

    # Price distribution
    prices = [p.asking_price for p in active_props if p.asking_price]
    if prices:
        price_distribution = f"Range: ${min(prices):,} - ${max(prices):,}, Median: ${sorted(prices)[len(prices)//2]:,}"
    else:
        price_distribution = "No priced active listings"

    # Recent activity summary
    act_type_counts = Counter(a.activity_type for a in recent_activities)
    recent_activity_summary = "\n".join(f"- {t}: {c}" for t, c in act_type_counts.most_common()) or "No recent activity"

    # Contact preferences aggregation
    parish_demand = Counter()
    for c in contacts:
        for p in (c.preferred_parishes or []):
            parish_demand[p] += 1
    contact_preferences = "\n".join(
        f"- {parish}: {count} contacts interested"
        for parish, count in parish_demand.most_common(10)
    ) or "No preference data"

    prompt = DASHBOARD_INSIGHTS_TEMPLATE.format(
        num_properties=len(properties),
        num_active=len(active_props),
        num_contacts=len(contacts),
        num_leads=len(leads),
        portfolio_value=portfolio_value,
        properties_by_state=properties_by_state,
        properties_by_parish=properties_by_parish or "None",
        properties_by_status=properties_by_status or "None",
        price_distribution=price_distribution,
        num_recent_activities=len(recent_activities),
        recent_activity_summary=recent_activity_summary,
        contact_preferences=contact_preferences,
    )

    response = assistant.chat(
        [{"role": "user", "content": prompt}],
        system=DASHBOARD_INSIGHTS_SYSTEM,
        max_tokens=settings.MAX_TOKENS_ANALYSIS,
        model=settings.AI_MODEL_FAST,
    )

    # Parse response
    insights = _parse_section(response, "INSIGHTS")
    actions = _parse_section(response, "ACTIONS")
    opportunities = _parse_section(response, "OPPORTUNITIES")

    return DashboardInsightsResponse(
        insights=insights,
        actions=actions,
        opportunities=opportunities,
        raw_analysis=response,
    )


def _parse_section(text: str, section: str) -> list[str]:
    """Extract bullet points from a section like INSIGHTS:, ACTIONS:, etc."""
    pattern = rf"{section}:\s*\n((?:- .+\n?)+)"
    match = re.search(pattern, text)
    if not match:
        return []
    items = re.findall(r"- (.+)", match.group(1))
    return [item.strip() for item in items if item.strip()]


@router.post("/auto-comp-analysis", response_model=CompAnalysisResponse)
async def auto_comp_analysis(request: AutoCompAnalysisRequest, db: AsyncSession = Depends(get_db)):
    """Fetch real market comps for a property, then run AI comp analysis."""
    # Fetch the property
    result = await db.execute(select(Property).where(Property.id == request.property_id))
    prop = result.scalar_one_or_none()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    if not market_data.is_configured():
        raise HTTPException(status_code=503, detail="Market data API not configured. Set REALTY_MOLE_API_KEY in .env")

    # Build full address for API lookup
    state_label = prop.state or "LA"
    full_address = f"{prop.street_address}, {prop.city}, {state_label} {prop.zip_code}"

    # Fetch comps from market data API (sync — runs in threadpool)
    try:
        market_result = market_data.search_comps(
            address=full_address,
            sqft=prop.sqft,
            bedrooms=prop.bedrooms,
            bathrooms=prop.bathrooms,
            comp_count=request.comp_count,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail="Market data API error. Please try again later.")

    if not market_result.comps:
        raise HTTPException(status_code=404, detail="No comparable sales found for this address")

    # Convert market comps to CompData for AI analysis
    comp_data = [
        CompData(
            address=c.address,
            sale_price=c.sale_price,
            sqft=c.sqft,
            bedrooms=c.bedrooms,
            bathrooms=c.bathrooms,
            sale_date=c.sale_date,
            notes=f"Distance: {c.distance_miles:.1f}mi, Type: {c.property_type}" if c.distance_miles else None,
        )
        for c in market_result.comps
        if c.sale_price > 0
    ]

    if not comp_data:
        raise HTTPException(status_code=404, detail="No comps with sale prices found")

    # Run AI analysis (sync)
    analysis_request = CompAnalysisRequest(
        subject_address=full_address,
        subject_sqft=prop.sqft,
        subject_bedrooms=prop.bedrooms,
        subject_bathrooms=prop.bathrooms,
        subject_lot_acres=prop.lot_size_acres,
        subject_year_built=prop.year_built,
        subject_features=prop.features,
        comps=comp_data,
    )
    analysis_result = analyze_comps(analysis_request)

    # Save AI suggested price to property
    prop.ai_suggested_price = analysis_result.suggested_price
    await db.commit()

    # Log activity
    activity = Activity(
        activity_type="ai_action",
        title=f"AI Comp Analysis: ${analysis_result.suggested_price:,} suggested",
        description=f"Analyzed {len(comp_data)} market comps. Range: ${analysis_result.price_range_low:,} - ${analysis_result.price_range_high:,}",
        property_id=request.property_id,
    )
    db.add(activity)
    await db.commit()

    return analysis_result


@router.get("/usage")
def usage_stats():
    return assistant.usage.get_stats()

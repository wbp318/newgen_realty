from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.activity import Activity
from app.models.outreach import OutreachCampaign, OutreachMessage
from app.models.prospect import Prospect
from app.models.prospect_list import ProspectList
from app.schemas.outreach import (
    CampaignInsightsResponse,
    GenerateMessageRequest,
    GenerateMessageResponse,
    OutreachCampaignCreate,
    OutreachCampaignResponse,
    OutreachCampaignUpdate,
    OutreachMessageResponse,
)
from app.services.outreach_generator import generate_outreach_message, generate_campaign_insights
from app.services.prospect_enrichment import validate_outreach_compliance

router = APIRouter(prefix="/api/outreach", tags=["outreach"])


# ---------------------------------------------------------------------------
# Campaign CRUD
# ---------------------------------------------------------------------------

@router.get("/campaigns", response_model=list[OutreachCampaignResponse])
async def list_campaigns(
    status: Optional[str] = Query(None),
    campaign_type: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    query = select(OutreachCampaign).order_by(OutreachCampaign.created_at.desc())
    if status:
        query = query.where(OutreachCampaign.status == status)
    if campaign_type:
        query = query.where(OutreachCampaign.campaign_type == campaign_type)
    query = query.limit(limit).offset(offset)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/campaigns", response_model=OutreachCampaignResponse, status_code=201)
async def create_campaign(data: OutreachCampaignCreate, db: AsyncSession = Depends(get_db)):
    campaign = OutreachCampaign(**data.model_dump(exclude_none=True))
    db.add(campaign)
    await db.commit()
    await db.refresh(campaign)
    return campaign


@router.get("/campaigns/{campaign_id}", response_model=OutreachCampaignResponse)
async def get_campaign(campaign_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(OutreachCampaign).where(OutreachCampaign.id == campaign_id)
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign


@router.put("/campaigns/{campaign_id}", response_model=OutreachCampaignResponse)
async def update_campaign(
    campaign_id: str,
    data: OutreachCampaignUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(OutreachCampaign).where(OutreachCampaign.id == campaign_id)
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    updated = data.model_dump(exclude_none=True)
    for key, value in updated.items():
        setattr(campaign, key, value)
    await db.commit()
    await db.refresh(campaign)
    return campaign


# ---------------------------------------------------------------------------
# Campaign Messages
# ---------------------------------------------------------------------------

@router.get("/campaigns/{campaign_id}/messages", response_model=list[OutreachMessageResponse])
async def list_campaign_messages(
    campaign_id: str,
    status: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(OutreachMessage)
        .where(OutreachMessage.campaign_id == campaign_id)
        .order_by(OutreachMessage.created_at.desc())
    )
    if status:
        query = query.where(OutreachMessage.status == status)
    query = query.limit(limit).offset(offset)
    result = await db.execute(query)
    return result.scalars().all()


# ---------------------------------------------------------------------------
# Generate Messages
# ---------------------------------------------------------------------------

@router.post("/generate-message", response_model=GenerateMessageResponse)
async def gen_message(request: GenerateMessageRequest, db: AsyncSession = Depends(get_db)):
    """Generate an AI-personalized outreach message for a prospect."""
    # Fetch prospect
    result = await db.execute(select(Prospect).where(Prospect.id == request.prospect_id))
    prospect = result.scalar_one_or_none()
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")

    # Check compliance
    prospect_dict = {
        "consent_status": prospect.consent_status,
        "dnc_listed": prospect.dnc_listed,
        "opt_out_date": str(prospect.opt_out_date) if prospect.opt_out_date else None,
        "opt_out_processed": prospect.opt_out_processed,
        "status": prospect.status,
        "email": prospect.email,
        "phone": prospect.phone,
        "mailing_address": prospect.mailing_address,
    }
    compliance_flags = validate_outreach_compliance(prospect_dict)

    # Build prospect data for the generator
    prospect_data = {
        "first_name": prospect.first_name,
        "last_name": prospect.last_name,
        "property_address": prospect.property_address,
        "property_city": prospect.property_city,
        "property_state": prospect.property_state,
        "prospect_type": prospect.prospect_type,
        "property_data": prospect.property_data,
        "motivation_signals": prospect.motivation_signals,
        "mailing_address": prospect.mailing_address,
    }

    # Generate the message (sync — runs in threadpool)
    msg_result = generate_outreach_message(
        prospect_data=prospect_data,
        medium=request.medium,
        tone=request.tone,
    )

    # Save as OutreachMessage
    message = OutreachMessage(
        campaign_id=request.campaign_id,
        prospect_id=request.prospect_id,
        medium=request.medium,
        subject=msg_result.get("subject"),
        body=msg_result["body"],
        status="draft",
        consent_verified=prospect.consent_status == "granted",
        dnc_cleared=prospect.dnc_checked and not prospect.dnc_listed,
        compliance_notes=", ".join(compliance_flags) if compliance_flags else None,
    )
    db.add(message)

    # Update campaign message count
    campaign_result = await db.execute(
        select(OutreachCampaign).where(OutreachCampaign.id == request.campaign_id)
    )
    campaign = campaign_result.scalar_one_or_none()
    if campaign:
        campaign.total_messages = (campaign.total_messages or 0) + 1

    await db.commit()

    # Log activity
    activity = Activity(
        activity_type="ai_action",
        title=f"AI outreach {request.medium} generated",
        description=f"For prospect at {prospect.property_address}",
        prospect_id=request.prospect_id,
    )
    db.add(activity)
    await db.commit()

    return GenerateMessageResponse(
        subject=msg_result.get("subject"),
        body=msg_result["body"],
        compliance_flags=compliance_flags,
    )


@router.post("/campaigns/{campaign_id}/generate-all")
async def generate_all_messages(
    campaign_id: str,
    medium: str = Query("email"),
    tone: str = Query("professional"),
    db: AsyncSession = Depends(get_db),
):
    """Generate AI messages for all prospects in a campaign's list."""
    result = await db.execute(
        select(OutreachCampaign).where(OutreachCampaign.id == campaign_id)
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if not campaign.prospect_list_id:
        raise HTTPException(status_code=400, detail="Campaign has no prospect list assigned")

    # Fetch prospect list
    list_result = await db.execute(
        select(ProspectList).where(ProspectList.id == campaign.prospect_list_id)
    )
    pl = list_result.scalar_one_or_none()
    if not pl or not pl.prospect_ids:
        raise HTTPException(status_code=400, detail="Prospect list is empty")

    # Fetch all prospects in the list
    prospects_result = await db.execute(
        select(Prospect).where(Prospect.id.in_(pl.prospect_ids))
    )
    prospects = prospects_result.scalars().all()

    generated = 0
    skipped = 0
    flagged = 0

    for prospect in prospects:
        # Check if message already exists for this campaign + prospect
        existing = await db.execute(
            select(OutreachMessage).where(
                OutreachMessage.campaign_id == campaign_id,
                OutreachMessage.prospect_id == prospect.id,
            )
        )
        if existing.scalar_one_or_none():
            skipped += 1
            continue

        # Check compliance
        prospect_dict = {
            "consent_status": prospect.consent_status,
            "dnc_listed": prospect.dnc_listed,
            "opt_out_date": str(prospect.opt_out_date) if prospect.opt_out_date else None,
            "opt_out_processed": prospect.opt_out_processed,
            "status": prospect.status,
            "email": prospect.email,
            "phone": prospect.phone,
            "mailing_address": prospect.mailing_address,
        }
        compliance_flags = validate_outreach_compliance(prospect_dict)

        if "do_not_contact" in compliance_flags:
            skipped += 1
            continue

        if compliance_flags:
            flagged += 1

        # Generate message
        prospect_data = {
            "first_name": prospect.first_name,
            "last_name": prospect.last_name,
            "property_address": prospect.property_address,
            "property_city": prospect.property_city,
            "property_state": prospect.property_state,
            "prospect_type": prospect.prospect_type,
            "property_data": prospect.property_data,
            "motivation_signals": prospect.motivation_signals,
            "mailing_address": prospect.mailing_address,
        }

        msg_result = generate_outreach_message(
            prospect_data=prospect_data,
            medium=medium,
            tone=tone,
        )

        message = OutreachMessage(
            campaign_id=campaign_id,
            prospect_id=prospect.id,
            medium=medium,
            subject=msg_result.get("subject"),
            body=msg_result["body"],
            status="draft",
            consent_verified=prospect.consent_status == "granted",
            dnc_cleared=prospect.dnc_checked and not prospect.dnc_listed,
            compliance_notes=", ".join(compliance_flags) if compliance_flags else None,
        )
        db.add(message)
        generated += 1

    # Update campaign counts
    campaign.total_messages = (campaign.total_messages or 0) + generated
    await db.commit()

    # Log activity
    activity = Activity(
        activity_type="ai_action",
        title=f"Bulk outreach generation: {generated} messages",
        description=f"Campaign: {campaign.name}. Generated: {generated}, Skipped: {skipped}, Flagged: {flagged}",
    )
    db.add(activity)
    await db.commit()

    return {
        "generated": generated,
        "skipped": skipped,
        "flagged": flagged,
        "total_in_list": len(prospects),
    }


# ---------------------------------------------------------------------------
# Message Status
# ---------------------------------------------------------------------------

@router.put("/messages/{message_id}/status")
async def update_message_status(
    message_id: str,
    status: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Update message status (sent, delivered, opened, replied, etc.)."""
    result = await db.execute(
        select(OutreachMessage).where(OutreachMessage.id == message_id)
    )
    message = result.scalar_one_or_none()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    now = datetime.utcnow()
    message.status = status
    if status == "sent" and not message.sent_at:
        message.sent_at = now
    elif status == "delivered" and not message.delivered_at:
        message.delivered_at = now
    elif status == "opened" and not message.opened_at:
        message.opened_at = now
    elif status == "replied" and not message.replied_at:
        message.replied_at = now

    # Update campaign aggregate counts
    campaign_result = await db.execute(
        select(OutreachCampaign).where(OutreachCampaign.id == message.campaign_id)
    )
    campaign = campaign_result.scalar_one_or_none()
    if campaign:
        if status == "sent":
            campaign.sent_count = (campaign.sent_count or 0) + 1
        elif status == "delivered":
            campaign.delivered_count = (campaign.delivered_count or 0) + 1
        elif status == "opened":
            campaign.opened_count = (campaign.opened_count or 0) + 1
        elif status == "replied":
            campaign.replied_count = (campaign.replied_count or 0) + 1

    await db.commit()
    return {"message_id": message_id, "status": status}


# ---------------------------------------------------------------------------
# Campaign Insights
# ---------------------------------------------------------------------------

@router.post("/campaigns/{campaign_id}/insights", response_model=CampaignInsightsResponse)
async def campaign_insights(campaign_id: str, db: AsyncSession = Depends(get_db)):
    """Generate AI insights for a campaign."""
    result = await db.execute(
        select(OutreachCampaign).where(OutreachCampaign.id == campaign_id)
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Fetch messages with prospect data
    msgs_result = await db.execute(
        select(OutreachMessage).where(OutreachMessage.campaign_id == campaign_id)
    )
    messages = msgs_result.scalars().all()

    # Build message data with prospect types
    message_data = []
    for msg in messages:
        prospect_result = await db.execute(
            select(Prospect).where(Prospect.id == msg.prospect_id)
        )
        prospect = prospect_result.scalar_one_or_none()
        message_data.append({
            "medium": msg.medium,
            "status": msg.status,
            "prospect_type": prospect.prospect_type if prospect else "unknown",
        })

    campaign_data = {
        "id": campaign.id,
        "name": campaign.name,
        "campaign_type": campaign.campaign_type,
        "status": campaign.status,
        "total_messages": campaign.total_messages or 0,
        "sent_count": campaign.sent_count or 0,
        "delivered_count": campaign.delivered_count or 0,
        "opened_count": campaign.opened_count or 0,
        "replied_count": campaign.replied_count or 0,
    }

    insights = generate_campaign_insights(campaign_data, message_data)

    # Save insights to campaign
    campaign.ai_campaign_insights = insights.get("raw_analysis", "")
    campaign.ai_insights_generated_at = datetime.utcnow()
    await db.commit()

    return CampaignInsightsResponse(**insights)

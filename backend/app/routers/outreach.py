import hashlib
import hmac
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.activity import Activity
from app.models.outreach import CampaignStatus, MessageStatus, OutreachCampaign, OutreachMessage
from app.models.prospect import ConsentStatus, Prospect
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
from app.services.rate_limit import rate_limit

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/outreach", tags=["outreach"])

# 20 AI message generations per minute per IP — pentest target
_generate_rate_limit = rate_limit("outreach.generate_message", limit=20, window_seconds=60)


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

@router.post("/generate-message", response_model=GenerateMessageResponse, dependencies=[Depends(_generate_rate_limit)])
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


# ---------------------------------------------------------------------------
# Drip scheduler: activate / pause / send-now
# ---------------------------------------------------------------------------

def _default_sequence() -> list[dict]:
    """Single-touch default if the campaign has no sequence_config."""
    return [{"step": 1, "day_offset": 0, "medium": "email", "tone_override": None}]


@router.post("/campaigns/{campaign_id}/activate")
async def activate_campaign(campaign_id: str, db: AsyncSession = Depends(get_db)):
    """Expand sequence_config into per-prospect OutreachMessage rows.

    Idempotent: skips (campaign_id, prospect_id, sequence_step) that already exist.
    """
    result = await db.execute(
        select(OutreachCampaign).where(OutreachCampaign.id == campaign_id)
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if not campaign.prospect_list_id:
        raise HTTPException(status_code=400, detail="Campaign has no prospect list assigned")

    pl = (
        await db.execute(
            select(ProspectList).where(ProspectList.id == campaign.prospect_list_id)
        )
    ).scalar_one_or_none()
    if not pl or not pl.prospect_ids:
        raise HTTPException(status_code=400, detail="Prospect list is empty")

    prospects = (
        await db.execute(select(Prospect).where(Prospect.id.in_(pl.prospect_ids)))
    ).scalars().all()

    sequence = campaign.sequence_config or _default_sequence()
    existing_keys = set(
        (m.prospect_id, m.sequence_step)
        for m in (
            await db.execute(
                select(OutreachMessage).where(OutreachMessage.campaign_id == campaign_id)
            )
        ).scalars().all()
    )

    now = datetime.now(timezone.utc)
    queued = 0
    skipped_existing = 0
    blocked = 0

    for prospect in prospects:
        # Hard-block opt-outs and do-not-contact entirely
        if prospect.status == "do_not_contact" or prospect.consent_status == ConsentStatus.REVOKED.value:
            blocked += 1
            continue

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

        for step in sequence:
            step_num = int(step.get("step", 1))
            if (prospect.id, step_num) in existing_keys:
                skipped_existing += 1
                continue

            medium = step.get("medium", "email")
            tone = step.get("tone_override") or "professional"
            day_offset = int(step.get("day_offset", 0))

            if campaign.ai_personalize:
                msg = generate_outreach_message(
                    prospect_data=prospect_data, medium=medium, tone=tone
                )
                subject = msg.get("subject")
                body = msg["body"]
            else:
                subject = None
                body = campaign.message_template or ""

            scheduled = now + timedelta(days=day_offset)
            message = OutreachMessage(
                campaign_id=campaign_id,
                prospect_id=prospect.id,
                medium=medium,
                subject=subject,
                body=body,
                status=MessageStatus.QUEUED.value,
                sequence_step=step_num,
                scheduled_send_time=scheduled,
                consent_verified=prospect.consent_status == ConsentStatus.GRANTED.value,
                dnc_cleared=prospect.dnc_checked and not prospect.dnc_listed,
            )
            db.add(message)
            queued += 1

    campaign.status = CampaignStatus.ACTIVE.value
    if not campaign.started_at:
        campaign.started_at = now
    campaign.total_messages = (campaign.total_messages or 0) + queued
    await db.commit()

    db.add(
        Activity(
            activity_type="status_change",
            title=f"Activated campaign: {campaign.name}",
            description=f"Queued {queued} messages across {len(sequence)} steps",
            extra_data={"campaign_id": campaign_id, "queued": queued, "blocked": blocked},
        )
    )
    await db.commit()

    return {
        "campaign_id": campaign_id,
        "status": CampaignStatus.ACTIVE.value,
        "queued": queued,
        "skipped_existing": skipped_existing,
        "blocked": blocked,
    }


@router.post("/campaigns/{campaign_id}/pause")
async def pause_campaign(campaign_id: str, db: AsyncSession = Depends(get_db)):
    """Pause a campaign. Queued messages stay queued and resume on re-activate."""
    result = await db.execute(
        select(OutreachCampaign).where(OutreachCampaign.id == campaign_id)
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    campaign.status = CampaignStatus.PAUSED.value
    await db.commit()
    return {"campaign_id": campaign_id, "status": CampaignStatus.PAUSED.value}


@router.post("/messages/{message_id}/send-now")
async def send_message_now(message_id: str, db: AsyncSession = Depends(get_db)):
    """Dispatch a queued or draft message immediately (compliance-gated)."""
    from app.services.scheduler import _dispatch_one

    result = await db.execute(
        select(OutreachMessage).where(OutreachMessage.id == message_id)
    )
    message = result.scalar_one_or_none()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    prospect = (
        await db.execute(select(Prospect).where(Prospect.id == message.prospect_id))
    ).scalar_one_or_none()
    campaign = (
        await db.execute(
            select(OutreachCampaign).where(OutreachCampaign.id == message.campaign_id)
        )
    ).scalar_one_or_none()
    if not prospect or not campaign:
        raise HTTPException(status_code=400, detail="Missing prospect or campaign")

    # Force a "send window" match by temporarily widening if manual override
    original_start, original_end = campaign.send_window_start, campaign.send_window_end
    campaign.send_window_start, campaign.send_window_end = 0, 24
    try:
        message.status = MessageStatus.QUEUED.value
        await _dispatch_one(db, message, prospect, campaign)
        await db.commit()
    finally:
        campaign.send_window_start, campaign.send_window_end = original_start, original_end
        await db.commit()

    return {
        "message_id": message_id,
        "status": message.status,
        "provider_message_id": message.provider_message_id,
        "last_error": message.last_error,
    }


# ---------------------------------------------------------------------------
# Inbound webhooks (Resend + Twilio)
# ---------------------------------------------------------------------------

def _constant_time_equals(a: str, b: str) -> bool:
    return hmac.compare_digest(a.encode(), b.encode())


@router.post("/webhooks/resend")
async def resend_webhook(
    request: Request,
    svix_signature: Optional[str] = Header(None, alias="svix-signature"),
    db: AsyncSession = Depends(get_db),
):
    """Handle Resend email events (delivered, opened, bounced, complained).

    Resend uses Svix-style HMAC signatures. If INBOUND_WEBHOOK_SECRET is set,
    we require a valid signature; otherwise we accept (useful for local dev).
    """
    body = await request.body()

    if settings.INBOUND_WEBHOOK_SECRET:
        expected = hmac.new(
            settings.INBOUND_WEBHOOK_SECRET.encode(), body, hashlib.sha256
        ).hexdigest()
        provided = (svix_signature or "").split(",")[-1].strip()
        if not _constant_time_equals(expected, provided):
            raise HTTPException(status_code=401, detail="Invalid signature")

    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    event_type = payload.get("type", "")
    data = payload.get("data", {})
    provider_id = data.get("email_id") or data.get("id")
    if not provider_id:
        return {"ok": True, "skipped": "no id"}

    msg = (
        await db.execute(
            select(OutreachMessage).where(OutreachMessage.provider_message_id == provider_id)
        )
    ).scalar_one_or_none()
    if not msg:
        return {"ok": True, "skipped": "message not found"}

    now = datetime.now(timezone.utc)
    status_map = {
        "email.delivered": (MessageStatus.DELIVERED.value, "delivered_at"),
        "email.opened": (MessageStatus.OPENED.value, "opened_at"),
        "email.bounced": (MessageStatus.BOUNCED.value, None),
        "email.complained": (MessageStatus.FAILED.value, None),
    }
    if event_type in status_map:
        new_status, ts_field = status_map[event_type]
        msg.status = new_status
        if ts_field:
            setattr(msg, ts_field, now)
        # Update campaign aggregates
        campaign = (
            await db.execute(
                select(OutreachCampaign).where(OutreachCampaign.id == msg.campaign_id)
            )
        ).scalar_one_or_none()
        if campaign:
            if event_type == "email.delivered":
                campaign.delivered_count = (campaign.delivered_count or 0) + 1
            elif event_type == "email.opened":
                campaign.opened_count = (campaign.opened_count or 0) + 1
        await db.commit()

    return {"ok": True, "event": event_type}


@router.post("/webhooks/twilio")
async def twilio_webhook(
    request: Request,
    x_twilio_signature: Optional[str] = Header(None, alias="X-Twilio-Signature"),
    db: AsyncSession = Depends(get_db),
):
    """Handle Twilio status callbacks and inbound SMS.

    Twilio posts application/x-www-form-urlencoded. An inbound SMS includes a
    'Body' field; a status callback includes 'MessageSid' and 'MessageStatus'.
    """
    # Twilio signature validation is best done with their SDK helper, but we
    # accept any request when no secret is configured (local dev).
    form = await request.form()
    params = dict(form)

    # Inbound SMS reply
    if params.get("Body") and params.get("From"):
        from_number = str(params["From"])
        body = str(params["Body"]).strip()

        # Look up prospect by phone (tolerant of formatting differences)
        digits = "".join(c for c in from_number if c.isdigit())
        candidates = (
            await db.execute(select(Prospect).where(Prospect.phone.isnot(None)))
        ).scalars().all()
        prospect = next(
            (p for p in candidates if "".join(c for c in (p.phone or "") if c.isdigit()).endswith(digits[-10:])),
            None,
        )

        if prospect:
            stop_keywords = {"STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"}
            now = datetime.now(timezone.utc)
            if body.upper() in stop_keywords:
                prospect.opt_out_date = now
                prospect.consent_status = ConsentStatus.REVOKED.value
                prospect.status = "do_not_contact"
                # Cancel all future queued SMS for this prospect
                future_msgs = (
                    await db.execute(
                        select(OutreachMessage).where(
                            OutreachMessage.prospect_id == prospect.id,
                            OutreachMessage.status == MessageStatus.QUEUED.value,
                            OutreachMessage.medium == "text",
                        )
                    )
                ).scalars().all()
                for m in future_msgs:
                    m.status = MessageStatus.FAILED.value
                    m.last_error = "Recipient opted out via STOP"
                db.add(
                    Activity(
                        activity_type="status_change",
                        title="Opt-out received (STOP)",
                        description=f"From {from_number}; {len(future_msgs)} future messages cancelled",
                        prospect_id=prospect.id,
                    )
                )
            else:
                db.add(
                    Activity(
                        activity_type="text",
                        title=f"Reply from {from_number}",
                        description=body[:500],
                        prospect_id=prospect.id,
                        contact_id=prospect.contact_id,
                    )
                )
                # Mark the most recent sent SMS as replied
                recent_sms = (
                    await db.execute(
                        select(OutreachMessage)
                        .where(
                            OutreachMessage.prospect_id == prospect.id,
                            OutreachMessage.medium == "text",
                            OutreachMessage.status == MessageStatus.SENT.value,
                        )
                        .order_by(OutreachMessage.sent_at.desc())
                        .limit(1)
                    )
                ).scalar_one_or_none()
                if recent_sms:
                    recent_sms.status = MessageStatus.REPLIED.value
                    recent_sms.replied_at = now
                    recent_sms.extra_data = {"reply_body": body}
                    campaign = (
                        await db.execute(
                            select(OutreachCampaign).where(
                                OutreachCampaign.id == recent_sms.campaign_id
                            )
                        )
                    ).scalar_one_or_none()
                    if campaign:
                        campaign.replied_count = (campaign.replied_count or 0) + 1
            await db.commit()
        return {"ok": True, "kind": "inbound_sms"}

    # Status callback for an outbound SMS we sent
    sid = params.get("MessageSid")
    twilio_status = params.get("MessageStatus", "").lower()
    if sid and twilio_status:
        msg = (
            await db.execute(
                select(OutreachMessage).where(OutreachMessage.provider_message_id == sid)
            )
        ).scalar_one_or_none()
        if msg:
            now = datetime.now(timezone.utc)
            if twilio_status == "delivered":
                msg.status = MessageStatus.DELIVERED.value
                msg.delivered_at = now
                campaign = (
                    await db.execute(
                        select(OutreachCampaign).where(
                            OutreachCampaign.id == msg.campaign_id
                        )
                    )
                ).scalar_one_or_none()
                if campaign:
                    campaign.delivered_count = (campaign.delivered_count or 0) + 1
            elif twilio_status in ("failed", "undelivered"):
                msg.status = MessageStatus.FAILED.value
                msg.last_error = f"Twilio status: {twilio_status}"
            await db.commit()
        return {"ok": True, "kind": "status_callback"}

    return {"ok": True, "kind": "ignored"}

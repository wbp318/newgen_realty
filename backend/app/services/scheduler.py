"""Drip-campaign scheduler.

In-process AsyncIOScheduler that sweeps OutreachMessage rows where
status='queued' and scheduled_send_time <= now, then dispatches via
the configured email/SMS providers, respecting TCPA contact hours,
campaign send windows, and daily send caps.

Design notes:
- Messages outside the current send window stay QUEUED (not FAILED) so they
  will be retried on the next tick inside the window.
- Permanent blocks (revoked consent, DNC on phone/text, missing contact info)
  flip the message to FAILED with last_error set.
- Transient failures (provider error) increment retry_count; after 3 attempts
  the message is marked FAILED.
"""
import logging
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import and_, func, select

from app.config import settings
from app.database import async_session
from app.models.activity import Activity
from app.models.outreach import MessageStatus, OutreachCampaign, OutreachMessage
from app.models.prospect import Prospect
from app.services import compliance, email_sender, sms_sender

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()

MAX_RETRIES = 3

# Permanent reasons — message becomes FAILED instead of staying queued.
_PERMANENT_REASONS = {
    "No email address on file",
    "No phone number on file",
    "No mailing address on file",
    "Marked as Do Not Contact",
    "On Do Not Call list",
}


def _prospect_to_dict(p: Prospect) -> dict:
    return {
        "email": p.email,
        "phone": p.phone,
        "mailing_address": p.mailing_address,
        "consent_status": p.consent_status,
        "dnc_listed": p.dnc_listed,
        "opt_out_date": p.opt_out_date.isoformat() if p.opt_out_date else None,
        "opt_out_processed": p.opt_out_processed,
        "status": p.status,
        "contact_window_timezone": p.contact_window_timezone or "America/Chicago",
    }


def _within_campaign_window(campaign: OutreachCampaign, tz_name: str) -> bool:
    try:
        tz = ZoneInfo(tz_name)
    except (KeyError, ValueError):
        tz = ZoneInfo("America/Chicago")
    hour = datetime.now(tz).hour
    start = campaign.send_window_start if campaign.send_window_start is not None else 9
    end = campaign.send_window_end if campaign.send_window_end is not None else 18
    return start <= hour < end


async def _daily_cap_hit(session, medium: str, campaign: OutreachCampaign) -> bool:
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    global_cap = (
        settings.DAILY_SEND_CAP_EMAIL if medium == "email" else settings.DAILY_SEND_CAP_SMS
    )
    cap = campaign.daily_send_cap or global_cap
    count_q = select(func.count(OutreachMessage.id)).where(
        OutreachMessage.medium == medium,
        OutreachMessage.status.in_([MessageStatus.SENT.value, MessageStatus.DELIVERED.value]),
        OutreachMessage.sent_at >= today_start,
    )
    count = (await session.execute(count_q)).scalar() or 0
    return count >= cap


async def _dispatch_one(
    session, message: OutreachMessage, prospect: Prospect, campaign: OutreachCampaign
) -> None:
    prospect_dict = _prospect_to_dict(prospect)
    medium = message.medium

    # Compliance gate
    check = compliance.can_contact_via_medium(prospect_dict, medium)
    if not check["allowed"]:
        reasons = check["reasons"]
        permanent = any(r in _PERMANENT_REASONS for r in reasons)
        if permanent:
            message.status = MessageStatus.FAILED.value
            message.last_error = "; ".join(reasons)
            logger.info("Message %s permanently blocked: %s", message.id, reasons)
        else:
            # Transient (outside hours, pending opt-out) — leave queued
            message.compliance_notes = "; ".join(reasons)
            logger.debug("Message %s deferred: %s", message.id, reasons)
        return

    # Campaign-level send window
    tz_name = prospect.contact_window_timezone or "America/Chicago"
    if not _within_campaign_window(campaign, tz_name):
        message.compliance_notes = "Outside campaign send window"
        return

    # Daily cap
    if medium in ("email", "text") and await _daily_cap_hit(session, medium, campaign):
        message.compliance_notes = f"Daily {medium} cap reached"
        return

    # Dispatch
    try:
        if medium == "email":
            result = email_sender.send_email(
                to=prospect.email,
                subject=message.subject or "",
                body_text=message.body,
                tags={"campaign_id": campaign.id, "message_id": message.id},
            )
            message.provider = "resend"
        elif medium == "text":
            result = sms_sender.send_sms(to=prospect.phone, body=message.body)
            message.provider = "twilio"
        else:
            # "letter" and "phone" are out of scope for Phase 1A (phone handled in 1B)
            message.compliance_notes = f"Medium {medium} not auto-dispatched"
            return
    except ValueError as e:
        message.retry_count = (message.retry_count or 0) + 1
        message.last_error = str(e)
        if message.retry_count >= MAX_RETRIES:
            message.status = MessageStatus.FAILED.value
            logger.warning("Message %s failed after %d retries", message.id, MAX_RETRIES)
        return

    message.status = MessageStatus.SENT.value
    message.sent_at = datetime.now(timezone.utc)
    message.provider_message_id = result.get("provider_message_id")
    message.consent_verified = prospect.consent_status == "granted"
    message.dnc_cleared = not prospect.dnc_listed
    campaign.sent_count = (campaign.sent_count or 0) + 1

    activity_type = "email" if medium == "email" else "text"
    session.add(
        Activity(
            activity_type=activity_type,
            title=f"Sent {medium}: {message.subject or message.body[:40]}",
            description=f"Campaign '{campaign.name}' step {message.sequence_step}",
            prospect_id=prospect.id,
            contact_id=prospect.contact_id,
            extra_data={
                "campaign_id": campaign.id,
                "message_id": message.id,
                "provider": message.provider,
                "provider_message_id": message.provider_message_id,
            },
        )
    )


async def sweep_due_messages() -> None:
    """Single sweep pass — dispatch all queued messages whose time has come."""
    now = datetime.now(timezone.utc)

    async with async_session() as session:
        q = (
            select(OutreachMessage)
            .where(
                and_(
                    OutreachMessage.status == MessageStatus.QUEUED.value,
                    OutreachMessage.scheduled_send_time <= now,
                )
            )
            .limit(settings.SCHEDULER_BATCH_SIZE)
        )
        messages = (await session.execute(q)).scalars().all()
        if not messages:
            return

        prospect_ids = {m.prospect_id for m in messages}
        campaign_ids = {m.campaign_id for m in messages}
        prospects = {
            p.id: p
            for p in (
                await session.execute(select(Prospect).where(Prospect.id.in_(prospect_ids)))
            ).scalars()
        }
        campaigns = {
            c.id: c
            for c in (
                await session.execute(
                    select(OutreachCampaign).where(OutreachCampaign.id.in_(campaign_ids))
                )
            ).scalars()
        }

        for message in messages:
            prospect = prospects.get(message.prospect_id)
            campaign = campaigns.get(message.campaign_id)
            if not prospect or not campaign:
                message.status = MessageStatus.FAILED.value
                message.last_error = "Missing prospect or campaign"
                continue
            # Paused campaigns: leave queued, will resume when reactivated
            if campaign.status == "paused":
                continue
            await _dispatch_one(session, message, prospect, campaign)

        await session.commit()


def start_scheduler() -> None:
    if not settings.SCHEDULER_ENABLED:
        return
    if scheduler.running:
        return
    scheduler.add_job(
        sweep_due_messages,
        "interval",
        seconds=settings.SCHEDULER_TICK_SECONDS,
        id="sweep_due_messages",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    scheduler.start()
    logger.info("APScheduler started (tick=%ss)", settings.SCHEDULER_TICK_SECONDS)


def shutdown_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("APScheduler stopped")

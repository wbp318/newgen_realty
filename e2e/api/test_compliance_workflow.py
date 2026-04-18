"""TCPA / consent flows: STOP handling, opt-out propagation, DNC gating."""

import pytest

pytestmark = pytest.mark.api


def test_twilio_stop_keyword_opts_prospect_out(api, make_prospect):
    # Give this prospect a unique phone so the webhook's last-10-digits match
    # is unambiguous even if other rows exist in the dev DB.
    phone = "+15005550199"
    prospect = make_prospect(phone=phone, consent_status="granted")

    # Twilio posts form-encoded payloads.
    r = api.post(
        "/api/outreach/webhooks/twilio",
        data={"From": phone, "Body": "STOP", "MessageSid": "SMtest"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert r.status_code == 200, r.text
    assert r.json().get("ok") is True

    refetched = api.get(f"/api/prospects/{prospect['id']}").json()
    assert refetched["consent_status"] == "revoked"
    assert refetched["status"] == "do_not_contact"
    assert refetched["opt_out_date"] is not None


def test_stop_cancels_queued_sms_messages(
    api, make_prospect, make_campaign, make_prospect_list
):
    phone = "+15005550200"
    prospect = make_prospect(phone=phone, consent_status="granted")
    plist = make_prospect_list([prospect["id"]])
    campaign = make_campaign(
        campaign_type="sms",
        prospect_list_id=plist["id"],
        sequence_config=[
            {"step": 1, "day_offset": 0, "medium": "text"},
            {"step": 2, "day_offset": 2, "medium": "text"},
        ],
        ai_personalize=False,
        message_template="Hi",
    )
    activated = api.post(f"/api/outreach/campaigns/{campaign['id']}/activate").json()
    assert activated["queued"] == 2

    # STOP arrives from this prospect.
    api.post(
        "/api/outreach/webhooks/twilio",
        data={"From": phone, "Body": "stop", "MessageSid": "SMopt"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )

    msgs = api.get(f"/api/outreach/campaigns/{campaign['id']}/messages").json()
    texts_for_prospect = [m for m in msgs if m["prospect_id"] == prospect["id"]]
    assert texts_for_prospect, "expected at least one queued SMS"
    assert all(m["status"] == "failed" for m in texts_for_prospect)
    assert all(
        (m["last_error"] or "").lower().startswith("recipient opted out")
        for m in texts_for_prospect
    )


def test_inbound_sms_reply_logs_activity(api, make_prospect):
    phone = "+15005550201"
    prospect = make_prospect(phone=phone, consent_status="granted")

    r = api.post(
        "/api/outreach/webhooks/twilio",
        data={"From": phone, "Body": "Yes please call me tomorrow", "MessageSid": "SMreply"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert r.status_code == 200

    # Activity row with the prospect link must exist.
    r = api.get(f"/api/activities?prospect_id={prospect['id']}&activity_type=text")
    assert r.status_code == 200
    activities = r.json()
    assert activities, "expected a 'text' activity for the inbound reply"
    assert all(a["prospect_id"] == prospect["id"] for a in activities)


def test_dnc_batch_check_accepts_list(api, make_prospect):
    # The endpoint takes a raw JSON array (list[str] via Body), not a wrapper
    # object — distinct from /bulk-score-prospects which takes a schema.
    p = make_prospect()
    r = api.post("/api/prospects/batch-dnc-check", json=[p["id"]])
    assert r.status_code == 200, r.text
    body = r.json()
    assert "checked" in body or "results" in body

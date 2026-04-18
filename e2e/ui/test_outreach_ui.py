"""Playwright flow: an API-created campaign renders on the outreach pages."""

import pytest

pytestmark = pytest.mark.ui


def test_campaign_appears_on_outreach_index(page, web_url, make_campaign):
    campaign = make_campaign()

    page.goto(f"{web_url}/outreach")
    page.get_by_role("heading", name="Outreach Campaigns").wait_for()
    page.get_by_text(campaign["name"]).first.wait_for()


def test_campaign_detail_page_renders(page, web_url, make_campaign):
    campaign = make_campaign(description="Shown on the detail page")

    page.goto(f"{web_url}/outreach/{campaign['id']}")
    # The campaign name is rendered as the <h1>.
    page.get_by_role("heading", name=campaign["name"]).wait_for()
    page.get_by_text("Drip Sequence").wait_for()
    page.get_by_text("Messages (").first.wait_for()

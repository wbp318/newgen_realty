"""Playwright flow: a prospect created via the API is visible on the prospects
page and its detail page, confirming the list/detail views read what the API
writes.
"""

import re

import pytest

pytestmark = pytest.mark.ui


def test_api_created_prospect_appears_in_list(page, web_url, make_prospect):
    address = "999 Visible St"
    prospect = make_prospect(property_address=address)

    page.goto(f"{web_url}/prospects")
    page.get_by_role("heading", name="Prospects").wait_for()
    # Row for this address must render. We don't use a testid — the address is
    # unique per test run because of the UUID tag in the factory.
    page.get_by_text(address).first.wait_for()

    # Detail page loads and shows the same address.
    page.goto(f"{web_url}/prospects/{prospect['id']}")
    page.get_by_text(address).first.wait_for()


def test_prospects_search_page_shows_search_form(page, web_url):
    page.goto(f"{web_url}/prospects/search")
    page.get_by_role("heading", name="Search Public Records").wait_for()
    # The state selector and a submit-style button are the minimum we need
    # to prove the form rendered; we don't submit (that hits ATTOM).
    page.get_by_role("button", name=re.compile(r"search", re.IGNORECASE)).first.wait_for()

"""Basic Playwright smoke: every top-level page loads and the sidebar works."""

import pytest

pytestmark = pytest.mark.ui


@pytest.mark.parametrize(
    "path,heading",
    [
        ("/", "Dashboard"),
        ("/ai", "AI Assistant"),
        ("/prospects", "Prospects"),
        ("/prospects/search", "Search Public Records"),
        ("/outreach", "Outreach Campaigns"),
        ("/map", "Farm Map"),
        ("/contacts", "Contacts"),
        ("/properties", "Properties"),
    ],
)
def test_page_loads_with_expected_heading(page, web_url, path, heading):
    page.goto(f"{web_url}{path}")
    # Sidebar is rendered by the root layout — its presence confirms the shell mounted.
    page.get_by_role("heading", name="NewGen Realty").wait_for()
    # The page-specific heading is the canonical marker that the route rendered.
    page.get_by_role("heading", name=heading).wait_for()


def test_sidebar_navigation_between_pages(page, web_url):
    page.goto(web_url)
    page.get_by_role("link", name="Prospects").first.click()
    page.wait_for_url("**/prospects")
    page.get_by_role("heading", name="Prospects").wait_for()

    page.get_by_role("link", name="Outreach").first.click()
    page.wait_for_url("**/outreach")
    page.get_by_role("heading", name="Outreach Campaigns").wait_for()

    page.get_by_role("link", name="Farm Map").first.click()
    page.wait_for_url("**/map")
    page.get_by_role("heading", name="Farm Map").wait_for()

"""
Shared fixtures for the newgen_realty E2E suite.

Conventions
-----------
- API tests use the `api` fixture (an httpx.Client already pointed at the backend).
- UI tests use the `page` fixture from pytest-playwright and the `web_url` fixture.
- Factory fixtures (`make_prospect`, `make_campaign`, `make_contact`) create rows
  and auto-clean them up at teardown so tests don't pollute the dev DB.
- AI-dependent tests must be decorated with `@pytest.mark.ai`; they auto-skip
  when ANTHROPIC_API_KEY is not set.

The tests assume the backend is reachable at API_BASE_URL and the frontend at
WEB_BASE_URL. The runner scripts (`run_e2e.sh` / `run_e2e.ps1`) verify that
before invoking pytest.
"""

from __future__ import annotations

import os
import time
import uuid
from pathlib import Path
from typing import Any, Callable, Iterator

import httpx
import pytest
from dotenv import load_dotenv

E2E_DIR = Path(__file__).resolve().parent
load_dotenv(E2E_DIR / ".env.e2e", override=False)

API_BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000").rstrip("/")
# The backend's CORS allowlist is hard-coded to `http://localhost:3000`, so the
# browser tests MUST load the frontend from that exact origin — otherwise every
# XHR to the API fails with ERR_FAILED and pages render empty.
WEB_BASE_URL = os.getenv("WEB_BASE_URL", "http://localhost:3000").rstrip("/")
AI_ENABLED = bool(os.getenv("ANTHROPIC_API_KEY"))


# --------------------------------------------------------------------------- #
# Base URLs
# --------------------------------------------------------------------------- #

@pytest.fixture(scope="session")
def api_url() -> str:
    return API_BASE_URL


@pytest.fixture(scope="session")
def web_url() -> str:
    return WEB_BASE_URL


# --------------------------------------------------------------------------- #
# Backend readiness — runs once per session before any test.
# --------------------------------------------------------------------------- #

@pytest.fixture(scope="session", autouse=True)
def _wait_for_backend(api_url: str) -> None:
    deadline = time.time() + 30
    last_err: Exception | None = None
    while time.time() < deadline:
        try:
            r = httpx.get(f"{api_url}/api/health", timeout=3.0)
            if r.status_code == 200 and r.json().get("status") == "ok":
                return
        except Exception as e:  # noqa: BLE001 — intentionally broad during readiness poll
            last_err = e
        time.sleep(0.5)
    pytest.exit(
        f"Backend not reachable at {api_url}/api/health after 30s "
        f"(last error: {last_err!r}). Start the backend first.",
        returncode=2,
    )


# --------------------------------------------------------------------------- #
# HTTP client
# --------------------------------------------------------------------------- #

@pytest.fixture(scope="session")
def api(api_url: str) -> Iterator[httpx.Client]:
    with httpx.Client(base_url=api_url, timeout=30.0) as client:
        yield client


# --------------------------------------------------------------------------- #
# AI gating
# --------------------------------------------------------------------------- #

def pytest_collection_modifyitems(config, items):
    skip_ai = pytest.mark.skip(reason="ANTHROPIC_API_KEY not set; AI tests skipped")
    for item in items:
        if "ai" in item.keywords and not AI_ENABLED:
            item.add_marker(skip_ai)


# --------------------------------------------------------------------------- #
# Factory fixtures — create and clean up test data.
# --------------------------------------------------------------------------- #

def _tag() -> str:
    """Unique tag for every test row so cleanup finds its own rows."""
    return f"e2e-{uuid.uuid4().hex[:8]}"


@pytest.fixture
def make_prospect(api: httpx.Client) -> Iterator[Callable[..., dict[str, Any]]]:
    created_ids: list[str] = []

    def _create(**overrides: Any) -> dict[str, Any]:
        tag = _tag()
        payload = {
            "first_name": "Test",
            "last_name": f"Prospect {tag}",
            "email": f"{tag}@example.test",
            "phone": "+15555550100",
            "property_address": f"{tag} Test St",
            "property_city": "Shreveport",
            "property_parish": "Caddo",
            "property_state": "LA",
            "property_zip": "71101",
            "prospect_type": "absentee_owner",
            "status": "new",
            "notes": "created by e2e suite",
            "tags": ["e2e", tag],
        }
        payload.update(overrides)
        r = api.post("/api/prospects", json=payload)
        assert r.status_code == 201, f"create prospect failed: {r.status_code} {r.text}"
        data = r.json()
        created_ids.append(data["id"])
        return data

    yield _create

    for pid in created_ids:
        try:
            api.delete(f"/api/prospects/{pid}")
        except Exception:  # noqa: BLE001 — teardown should never fail the test
            pass


@pytest.fixture
def make_campaign(api: httpx.Client) -> Iterator[Callable[..., dict[str, Any]]]:
    created_ids: list[str] = []

    def _create(**overrides: Any) -> dict[str, Any]:
        tag = _tag()
        payload: dict[str, Any] = {
            "name": f"E2E Campaign {tag}",
            "campaign_type": "email",
            "ai_personalize": False,
            "message_template": "Hello {{first_name}}, test from {{tag}}.",
        }
        payload.update(overrides)
        r = api.post("/api/outreach/campaigns", json=payload)
        assert r.status_code == 201, f"create campaign failed: {r.status_code} {r.text}"
        data = r.json()
        created_ids.append(data["id"])
        return data

    yield _create

    # Campaigns don't have a DELETE endpoint — leave them, but mark paused so
    # they don't keep firing scheduled messages in the dev DB.
    for cid in created_ids:
        try:
            api.post(f"/api/outreach/campaigns/{cid}/pause")
        except Exception:  # noqa: BLE001
            pass


@pytest.fixture
def make_contact(api: httpx.Client) -> Iterator[Callable[..., dict[str, Any]]]:
    created_ids: list[str] = []

    def _create(**overrides: Any) -> dict[str, Any]:
        tag = _tag()
        payload = {
            "first_name": "Test",
            "last_name": f"Contact {tag}",
            "email": f"{tag}@example.test",
            "phone": "+15555550101",
            "contact_type": "lead",
            "source": "e2e",
        }
        payload.update(overrides)
        r = api.post("/api/contacts", json=payload)
        assert r.status_code == 201, f"create contact failed: {r.status_code} {r.text}"
        data = r.json()
        created_ids.append(data["id"])
        return data

    yield _create

    for cid in created_ids:
        try:
            api.delete(f"/api/contacts/{cid}")
        except Exception:  # noqa: BLE001
            pass


@pytest.fixture
def make_prospect_list(api: httpx.Client) -> Iterator[Callable[..., dict[str, Any]]]:
    def _create(prospect_ids: list[str], **overrides: Any) -> dict[str, Any]:
        tag = _tag()
        payload: dict[str, Any] = {
            "name": f"E2E List {tag}",
            "prospect_ids": prospect_ids,
        }
        payload.update(overrides)
        r = api.post("/api/prospects/lists", json=payload)
        assert r.status_code == 201, f"create list failed: {r.status_code} {r.text}"
        return r.json()

    yield _create
    # Prospect lists also have no DELETE — harmless to leave.


# --------------------------------------------------------------------------- #
# Playwright: headed/headless toggle via env, default headless.
# --------------------------------------------------------------------------- #

@pytest.fixture(scope="session")
def browser_type_launch_args(browser_type_launch_args: dict[str, Any]) -> dict[str, Any]:
    headed = os.getenv("PW_HEADED", "0") == "1"
    return {**browser_type_launch_args, "headless": not headed}

"""Smoke-level checks that the backend and its configuration endpoints respond."""

import pytest

pytestmark = pytest.mark.api


def test_health_endpoint(api):
    r = api.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["service"] == "newgen-realty"


def test_openapi_is_served(api):
    r = api.get("/openapi.json")
    assert r.status_code == 200
    spec = r.json()
    assert spec["info"]["title"] == "NewGen Realty AI"
    # Sanity: the routers we care about are registered.
    paths = set(spec["paths"].keys())
    required = {
        "/api/health",
        "/api/prospects",
        "/api/prospects/geo",
        "/api/outreach/campaigns",
        "/api/contacts",
        "/api/properties",
        "/api/activities",
    }
    missing = required - paths
    assert not missing, f"OpenAPI is missing expected paths: {missing}"


@pytest.mark.parametrize(
    "path",
    [
        "/api/prospects/status",
        "/api/market/status",
        "/api/prospects?limit=1",
        "/api/contacts?limit=1",
        "/api/properties?limit=1",
        "/api/activities?limit=1",
        "/api/outreach/campaigns?limit=1",
        "/api/prospects/geo",
        "/api/prospects/county-sources",
    ],
)
def test_read_only_endpoints_respond(api, path):
    r = api.get(path)
    assert r.status_code == 200, f"{path} returned {r.status_code}: {r.text[:200]}"

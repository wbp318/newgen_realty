"""End-to-end flows for the Prospect lifecycle.

Covers: create → list filter → fetch → update → score (AI) → convert → delete.
"""

import pytest

pytestmark = pytest.mark.api


def test_create_and_fetch_prospect(api, make_prospect):
    prospect = make_prospect(property_address="123 Workflow Ave")
    assert prospect["id"]
    assert prospect["property_address"] == "123 Workflow Ave"
    assert prospect["status"] == "new"

    # Round-trip the row through the single-fetch endpoint.
    r = api.get(f"/api/prospects/{prospect['id']}")
    assert r.status_code == 200
    assert r.json()["id"] == prospect["id"]


def test_create_rejects_missing_required_fields(api):
    r = api.post("/api/prospects", json={"first_name": "Only"})
    assert r.status_code == 422
    detail = r.json()["detail"]
    missing_fields = {err["loc"][-1] for err in detail}
    assert {"property_address", "prospect_type"}.issubset(missing_fields)


def test_list_filters_match_created_prospect(api, make_prospect):
    prospect = make_prospect(
        property_state="AR",
        property_parish="Pulaski",
        prospect_type="probate",
    )

    r = api.get("/api/prospects?state=AR&prospect_type=probate&limit=50")
    assert r.status_code == 200
    ids = [p["id"] for p in r.json()]
    assert prospect["id"] in ids


def test_update_prospect_persists(api, make_prospect):
    prospect = make_prospect()

    r = api.put(
        f"/api/prospects/{prospect['id']}",
        json={"status": "contacted", "notes": "updated by e2e"},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "contacted"

    refetched = api.get(f"/api/prospects/{prospect['id']}").json()
    assert refetched["status"] == "contacted"
    assert refetched["notes"] == "updated by e2e"


def test_convert_prospect_to_contact(api, make_prospect):
    prospect = make_prospect(
        first_name="Convert",
        last_name="Me",
        email="convert@example.test",
    )

    r = api.post(f"/api/prospects/{prospect['id']}/convert")
    assert r.status_code == 200, r.text
    contact = r.json()
    assert contact["email"] == "convert@example.test"
    contact_id = contact["id"]

    # Prospect is flagged as converted and linked to the new contact.
    refetched = api.get(f"/api/prospects/{prospect['id']}").json()
    assert refetched["status"] == "converted"
    assert refetched["contact_id"] == contact_id

    # Clean up the contact the router just created (factory can't see it).
    api.delete(f"/api/contacts/{contact_id}")


def test_delete_prospect_removes_it(api, make_prospect):
    prospect = make_prospect()

    r = api.delete(f"/api/prospects/{prospect['id']}")
    assert r.status_code == 204

    r = api.get(f"/api/prospects/{prospect['id']}")
    assert r.status_code == 404


def test_geo_endpoint_excludes_prospects_without_coordinates(api, make_prospect):
    # A prospect created without lat/lng must NOT appear in the geo feed.
    # Use an address Nominatim can't resolve at any fallback level
    # (the geocoder cascades street → city+state+zip → city+state → zip+state).
    prospect = make_prospect(
        property_address="nonexistent",
        property_city="zzzznonexistentcityzzzz",
        property_state="ZZ",
        property_zip="00000",
    )
    r = api.get("/api/prospects/geo?limit=200")
    assert r.status_code == 200
    ids = {p["id"] for p in r.json()}
    assert prospect["id"] not in ids


@pytest.mark.ai
def test_ai_score_prospect(api, make_prospect):
    prospect = make_prospect(
        prospect_type="absentee_owner",
        motivation_signals={"years_owned": 18, "tax_delinquent": True},
    )

    r = api.post("/api/ai/score-prospect", json={"prospect_id": prospect["id"]})
    assert r.status_code == 200, r.text
    body = r.json()
    assert 0 <= body["score"] <= 100
    assert body["motivation_level"] in {"low", "medium", "high"}
    assert body["reason"]

    # The score is persisted on the prospect row.
    refetched = api.get(f"/api/prospects/{prospect['id']}").json()
    assert refetched["ai_prospect_score"] == body["score"]
    assert refetched["ai_scored_at"] is not None

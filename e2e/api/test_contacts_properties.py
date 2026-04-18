"""Coverage for the contact + property CRUD used by the dashboard and AI tools."""

import pytest

pytestmark = pytest.mark.api


def test_contact_crud_round_trip(api, make_contact):
    contact = make_contact(contact_type="buyer", budget_min=150000, budget_max=300000)
    assert contact["id"]
    assert contact["contact_type"] == "buyer"

    r = api.put(
        f"/api/contacts/{contact['id']}",
        json={"notes": "followed up"},
    )
    assert r.status_code == 200
    assert r.json()["notes"] == "followed up"

    r = api.get(f"/api/contacts/{contact['id']}")
    assert r.status_code == 200
    assert r.json()["notes"] == "followed up"


def test_create_property_then_activity_links(api):
    payload = {
        "street_address": "456 Activity Ln",
        "city": "Shreveport",
        "parish": "Caddo",
        "state": "LA",
        "zip_code": "71101",
        "property_type": "single_family",
        "status": "active",
        "bedrooms": 3,
        "bathrooms": 2.0,
        "sqft": 1800,
        "asking_price": 250000,
    }
    r = api.post("/api/properties", json=payload)
    assert r.status_code == 201, r.text
    prop = r.json()
    prop_id = prop["id"]

    try:
        # Log an activity against the property.
        r = api.post(
            "/api/activities",
            json={
                "activity_type": "note",
                "title": "E2E note",
                "description": "activity linked to property",
                "property_id": prop_id,
            },
        )
        assert r.status_code == 201, r.text

        # It shows up when we filter activities by property.
        r = api.get(f"/api/activities?property_id={prop_id}")
        assert r.status_code == 200
        titles = [a["title"] for a in r.json()]
        assert "E2E note" in titles
    finally:
        api.delete(f"/api/properties/{prop_id}")


def test_contact_list_filter_by_type(api, make_contact):
    buyer = make_contact(contact_type="buyer")
    make_contact(contact_type="seller")

    r = api.get("/api/contacts?contact_type=buyer&limit=200")
    assert r.status_code == 200
    returned = {c["id"]: c for c in r.json()}
    assert buyer["id"] in returned
    assert all(c["contact_type"] == "buyer" for c in returned.values())

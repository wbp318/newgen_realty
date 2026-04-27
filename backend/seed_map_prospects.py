"""
Seed prospects with pre-set coordinates across LA/AR/MS for Farm Map manual testing.

Run from backend/ with venv activated:
    python seed_map_prospects.py

Skips inserts when an address already exists, so it's safe to re-run.
"""
import asyncio
from datetime import datetime
from sqlalchemy import select

from app.database import async_session, engine, Base
from app.models.prospect import Prospect


# (city, parish_or_county, state, lat, lng)
LOCATIONS = [
    # Louisiana
    ("New Orleans", "Orleans", "LA", 29.9511, -90.0715),
    ("Baton Rouge", "East Baton Rouge", "LA", 30.4515, -91.1871),
    ("Shreveport", "Caddo", "LA", 32.5252, -93.7502),
    ("Lafayette", "Lafayette", "LA", 30.2241, -92.0198),
    ("Metairie", "Jefferson", "LA", 29.9841, -90.1529),
    ("Lake Charles", "Calcasieu", "LA", 30.2266, -93.2174),
    ("Monroe", "Ouachita", "LA", 32.5093, -92.1193),
    ("Alexandria", "Rapides", "LA", 31.3113, -92.4451),
    # Arkansas
    ("Little Rock", "Pulaski", "AR", 34.7465, -92.2896),
    ("Fayetteville", "Washington", "AR", 36.0822, -94.1719),
    ("Bentonville", "Benton", "AR", 36.3729, -94.2088),
    ("Fort Smith", "Sebastian", "AR", 35.3859, -94.3985),
    ("Jonesboro", "Craighead", "AR", 35.8423, -90.7043),
    ("Hot Springs", "Garland", "AR", 34.5037, -93.0552),
    # Mississippi
    ("Jackson", "Hinds", "MS", 32.2988, -90.1848),
    ("Gulfport", "Harrison", "MS", 30.3674, -89.0928),
    ("Southaven", "DeSoto", "MS", 34.9889, -89.9886),
    ("Biloxi", "Harrison", "MS", 30.3960, -88.8853),
    ("Hattiesburg", "Forrest", "MS", 31.3271, -89.2903),
    ("Tupelo", "Lee", "MS", 34.2576, -88.7034),
    ("Meridian", "Lauderdale", "MS", 32.3643, -88.7037),
    ("Oxford", "Lafayette", "MS", 34.3665, -89.5192),
]

PROSPECT_TYPES = [
    "absentee_owner",
    "pre_foreclosure",
    "probate",
    "long_term_owner",
    "expired_listing",
    "fsbo",
    "vacant",
    "tax_delinquent",
]


def fake_address(city: str, idx: int) -> str:
    street_names = [
        "Magnolia Ln", "Oak St", "Pine Ave", "Cypress Dr", "Bayou Rd",
        "Cedar Ct", "River Rd", "Plantation Way", "Heritage Blvd", "Sunset Cir",
    ]
    house = 100 + (idx * 37) % 9000
    return f"{house} {street_names[idx % len(street_names)]}"


async def main() -> None:
    # Make sure tables exist (mirrors what main.py lifespan does)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as db:
        existing_addrs = set(
            (await db.execute(select(Prospect.property_address))).scalars().all()
        )

        inserted = 0
        skipped = 0
        for i, (city, parish, state, lat, lng) in enumerate(LOCATIONS):
            # 2-3 prospects per location, varied types/scores
            for j in range(2 + (i % 2)):  # 2 or 3 each
                addr = fake_address(city, i * 7 + j)
                if addr in existing_addrs:
                    skipped += 1
                    continue

                prospect_type = PROSPECT_TYPES[(i + j) % len(PROSPECT_TYPES)]
                # Spread scores across the 0-100 range deterministically
                score = (((i * 13) + (j * 29)) % 80) + 15  # 15..94
                # Tiny offset so markers don't perfectly stack at same lat/lng
                lat_off = (j * 0.012) - 0.006
                lng_off = (j * 0.014) - 0.007

                p = Prospect(
                    first_name=f"Test{i}{j}",
                    last_name=f"Owner{i}{j}",
                    email=f"test{i}{j}@example.com",
                    phone=f"+1318555{1000 + i*10 + j:04d}",
                    property_address=addr,
                    property_city=city,
                    property_parish=parish,
                    property_state=state,
                    property_zip="00000",
                    prospect_type=prospect_type,
                    status="new",
                    motivation_signals={"seed": True},
                    property_data={"estimated_value": 150000 + (i * 7500) + (j * 12000)},
                    ai_prospect_score=float(score),
                    ai_prospect_score_reason=f"Seed prospect — {prospect_type}",
                    ai_scored_at=datetime.utcnow(),
                    property_latitude=lat + lat_off,
                    property_longitude=lng + lng_off,
                    geocoded_at=datetime.utcnow(),
                    data_source="seed",
                    notes="Seed data for Farm Map manual testing",
                )
                db.add(p)
                inserted += 1

        await db.commit()

    print(f"Inserted: {inserted}  Skipped (already present): {skipped}")


if __name__ == "__main__":
    asyncio.run(main())

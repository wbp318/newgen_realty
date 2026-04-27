"""One-off: geocode any properties missing coordinates."""
import asyncio
from datetime import datetime
from sqlalchemy import select

from app.database import async_session
from app.models.property import Property
from app.services import geocoder


async def main() -> None:
    async with async_session() as db:
        result = await db.execute(
            select(Property).where(Property.latitude.is_(None))
        )
        props = result.scalars().all()
        print(f"Found {len(props)} properties without coordinates")

        updated = 0
        for p in props:
            print(f"  geocoding: {p.street_address}, {p.city}, {p.state}...")
            res = geocoder.geocode(p.street_address, p.city, p.state, p.zip_code)
            if res:
                p.latitude = res["latitude"]
                p.longitude = res["longitude"]
                p.geocoded_at = datetime.utcnow()
                updated += 1
                print(f"    -> {res['latitude']:.4f}, {res['longitude']:.4f}")
            else:
                print("    -> not found")

        await db.commit()
        print(f"\nUpdated {updated}/{len(props)} properties")


if __name__ == "__main__":
    asyncio.run(main())

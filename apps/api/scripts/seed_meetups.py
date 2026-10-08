import asyncio
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.meetup import MeetupPoint

POINTS = [
    ("Library Entrance", "Central", 13.1833, 77.6310),
    ("M Block Canteen", "Central", 13.1836, 77.6315),
    ("A Block Gate", "North", 13.1845, 77.6308),
    ("B Block Gate", "South", 13.1825, 77.6308),
    ("Hostel Main Gate", "Hostel", 13.1849, 77.6320),
    ("Sports Complex", "East", 13.1828, 77.6325),
    ("Open Air Theatre", "Central", 13.1838, 77.6312),
]


async def main():
    async with AsyncSessionLocal() as db:
        for name, zone, lat, lng in POINTS:
            exists = await db.execute(select(MeetupPoint).where(MeetupPoint.name == name))
            if exists.scalar_one_or_none():
                continue
            db.add(MeetupPoint(name=name, campus_zone=zone, latitude=lat, longitude=lng))
        await db.commit()
        print("seeded meetup points")


if __name__ == "__main__":
    asyncio.run(main())

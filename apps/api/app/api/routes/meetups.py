from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.meetup import MeetupPoint

router = APIRouter(prefix="/meetups", tags=["meetups"])


@router.get("")
async def list_meetups(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(MeetupPoint).where(MeetupPoint.is_active == True))
    return [
        {
            "id": str(m.id),
            "name": m.name,
            "campus_zone": m.campus_zone,
            "latitude": m.latitude,
            "longitude": m.longitude,
        }
        for m in res.scalars().all()
    ]

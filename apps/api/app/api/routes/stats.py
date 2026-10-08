from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.listing import Listing
from app.models.user import User
from app.models.handover import Handover
from app.models.wanted import WantedPost

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/campus")
async def campus_stats(db: AsyncSession = Depends(get_db)):
    active_listings = (await db.execute(select(func.count(Listing.id)).where(Listing.status == "ACTIVE"))).scalar_one()
    sold_listings = (await db.execute(select(func.count(Listing.id)).where(Listing.status == "SOLD"))).scalar_one()
    verified_users = (await db.execute(select(func.count(User.id)).where(User.email_verified == True))).scalar_one()
    verified_handovers = (await db.execute(select(func.count(Handover.id)).where(Handover.verified_at.is_not(None)))).scalar_one()
    open_wanted = (await db.execute(select(func.count(WantedPost.id)).where(WantedPost.status == "OPEN"))).scalar_one()

    return {
        "active_listings": active_listings,
        "sold_listings": sold_listings,
        "verified_users": verified_users,
        "verified_handovers": verified_handovers,
        "open_wanted": open_wanted,
    }

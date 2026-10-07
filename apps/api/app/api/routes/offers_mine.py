from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.conversation import Offer
from app.models.listing import Listing

router = APIRouter(prefix="/my-offers", tags=["offers"])


@router.get("")
async def my_offers(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(Offer, Listing)
        .join(Listing, Listing.id == Offer.listing_id)
        .where(Offer.buyer_id == user.id)
        .order_by(Offer.created_at.desc())
    )
    out = []
    for offer, listing in res.all():
        out.append({
            "id": str(offer.id),
            "listing_id": str(offer.listing_id),
            "listing_title": listing.title,
            "offer_price": float(offer.offer_price),
            "message": offer.message,
            "status": offer.status,
            "created_at": offer.created_at.isoformat(),
        })
    return out

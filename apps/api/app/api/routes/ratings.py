from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.conversation import Offer
from app.models.handover import Handover
from app.models.rating import Rating

router = APIRouter(tags=["ratings"])


class RatingIn(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str | None = Field(default=None, max_length=500)


@router.post("/handovers/{offer_id}/rate", status_code=201)
async def rate_handover(
    offer_id: UUID,
    body: RatingIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ores = await db.execute(select(Offer).where(Offer.id == offer_id))
    offer = ores.scalar_one_or_none()
    if offer is None:
        raise HTTPException(404, "offer not found")
    if user.id not in {offer.seller_id, offer.buyer_id}:
        raise HTTPException(403, "not part of this deal")

    hres = await db.execute(select(Handover).where(Handover.offer_id == offer_id))
    h = hres.scalar_one_or_none()
    if h is None or h.verified_at is None:
        raise HTTPException(400, "handover not verified yet")

    to_user_id = offer.seller_id if user.id == offer.buyer_id else offer.buyer_id

    existing = await db.execute(
        select(Rating).where(Rating.handover_id == h.id, Rating.from_user_id == user.id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(400, "you already rated this deal")

    r = Rating(
        handover_id=h.id, from_user_id=user.id, to_user_id=to_user_id,
        rating=body.rating, comment=body.comment,
    )
    db.add(r)
    await db.flush()

    # recompute target user's average rating
    agg = await db.execute(
        select(func.avg(Rating.rating), func.count(Rating.id)).where(Rating.to_user_id == to_user_id)
    )
    avg, count = agg.one()
    ures = await db.execute(select(User).where(User.id == to_user_id))
    target = ures.scalar_one_or_none()
    if target and avg is not None:
        target.avg_rating = round(float(avg), 2)

    await db.commit()
    return {"ok": True, "new_avg": float(target.avg_rating) if target else None}


@router.get("/handovers/{offer_id}/my-rating")
async def my_rating(
    offer_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    hres = await db.execute(select(Handover).where(Handover.offer_id == offer_id))
    h = hres.scalar_one_or_none()
    if h is None:
        return {"rated": False}
    res = await db.execute(
        select(Rating).where(Rating.handover_id == h.id, Rating.from_user_id == user.id)
    )
    r = res.scalar_one_or_none()
    if r is None:
        return {"rated": False}
    return {"rated": True, "rating": r.rating, "comment": r.comment}


@router.get("/users/{user_id}/ratings")
async def user_ratings(user_id: UUID, db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(Rating, User.name)
        .join(User, User.id == Rating.from_user_id)
        .where(Rating.to_user_id == user_id)
        .order_by(Rating.created_at.desc())
        .limit(20)
    )
    return [
        {
            "id": str(r.id),
            "rating": r.rating,
            "comment": r.comment,
            "from_name": name,
            "created_at": r.created_at,
        }
        for r, name in res.all()
    ]

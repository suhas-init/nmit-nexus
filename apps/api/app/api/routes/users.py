from uuid import UUID
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import User
from app.models.listing import Listing
from app.models.rating import Rating

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/{user_id}")
async def public_profile(user_id: UUID, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(User).where(User.id == user_id))
    u = res.scalar_one_or_none()
    if u is None:
        raise HTTPException(404, "user not found")

    listings = await db.execute(
        select(Listing).where(Listing.seller_id == user_id, Listing.status == "ACTIVE")
        .order_by(Listing.created_at.desc()).limit(30)
    )
    sold_count = await db.execute(
        select(func.count(Listing.id)).where(Listing.seller_id == user_id, Listing.status == "SOLD")
    )
    ratings = await db.execute(
        select(Rating, User.name)
        .join(User, User.id == Rating.from_user_id)
        .where(Rating.to_user_id == user_id)
        .order_by(Rating.created_at.desc()).limit(10)
    )

    return {
        "id": str(u.id),
        "name": u.name,
        "department": u.department,
        "bio": u.bio,
        "avatar_url": u.avatar_url,
        "campus_verified": u.campus_verified,
        "email_verified": u.email_verified,
        "created_at": u.created_at,
        "completed_transactions": u.completed_transactions or 0,
        "avg_rating": float(u.avg_rating or 0),
        "sold_count": sold_count.scalar_one() or 0,
        "active_listings": [
            {
                "id": str(l.id),
                "title": l.title,
                "price": float(l.price),
                "condition": l.condition,
                "type": l.type,
                "status": l.status,
                "created_at": l.created_at.isoformat(),
            }
            for l in listings.scalars().all()
        ],
        "recent_ratings": [
            {"rating": r.rating, "comment": r.comment, "from_name": name, "created_at": r.created_at.isoformat()}
            for r, name in ratings.all()
        ],
    }

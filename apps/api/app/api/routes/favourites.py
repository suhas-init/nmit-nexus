from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.listing import Listing
from app.models.favourite import Favourite

router = APIRouter(tags=["favourites"])


@router.post("/listings/{listing_id}/favourite")
async def add_fav(
    listing_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Listing).where(Listing.id == listing_id))
    if res.scalar_one_or_none() is None:
        raise HTTPException(404, "listing not found")
    existing = await db.execute(
        select(Favourite).where(Favourite.user_id == user.id, Favourite.listing_id == listing_id)
    )
    if existing.scalar_one_or_none() is None:
        db.add(Favourite(user_id=user.id, listing_id=listing_id))
        await db.commit()
    return {"favourited": True}


@router.delete("/listings/{listing_id}/favourite")
async def remove_fav(
    listing_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        delete(Favourite).where(Favourite.user_id == user.id, Favourite.listing_id == listing_id)
    )
    await db.commit()
    return {"favourited": False}


@router.get("/listings/{listing_id}/favourite")
async def is_fav(
    listing_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(Favourite).where(Favourite.user_id == user.id, Favourite.listing_id == listing_id)
    )
    return {"favourited": res.scalar_one_or_none() is not None}


@router.get("/favourites")
async def my_favs(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(Listing).join(Favourite, Favourite.listing_id == Listing.id)
        .where(Favourite.user_id == user.id)
        .order_by(Favourite.created_at.desc())
    )
    return [
        {
            "id": str(l.id),
            "seller_id": str(l.seller_id),
            "title": l.title,
            "description": l.description,
            "price": float(l.price),
            "condition": l.condition,
            "status": l.status,
            "type": l.type,
            "created_at": l.created_at.isoformat(),
        }
        for l in res.scalars().all()
    ]

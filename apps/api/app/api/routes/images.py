from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.listing import Listing
from app.models.listing_image import ListingImage

router = APIRouter(tags=["images"])


class ImagesIn(BaseModel):
    urls: list[str] = Field(min_length=1, max_length=6)


@router.post("/listings/{listing_id}/images")
async def set_images(
    listing_id: UUID,
    body: ImagesIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Listing).where(Listing.id == listing_id))
    listing = res.scalar_one_or_none()
    if listing is None:
        raise HTTPException(404, "listing not found")
    if listing.seller_id != user.id:
        raise HTTPException(403, "not your listing")

    await db.execute(delete(ListingImage).where(ListingImage.listing_id == listing_id))
    for i, url in enumerate(body.urls):
        db.add(ListingImage(listing_id=listing_id, storage_key=url, sort_order=i))
    await db.commit()
    return {"ok": True, "count": len(body.urls)}


@router.get("/listings/{listing_id}/images")
async def get_images(listing_id: UUID, db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(ListingImage).where(ListingImage.listing_id == listing_id).order_by(ListingImage.sort_order)
    )
    return [{"id": str(im.id), "url": im.storage_key, "sort_order": im.sort_order} for im in res.scalars().all()]

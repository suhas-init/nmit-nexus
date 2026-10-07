from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.listing import Listing
from app.models.user import User
from app.schemas.listing import ListingCreate, ListingOut, ListingUpdate

router = APIRouter(prefix="/listings", tags=["listings"])


def _serialize(l: Listing) -> ListingOut:
    return ListingOut(
        id=str(l.id),
        seller_id=str(l.seller_id),
        category_id=str(l.category_id) if l.category_id else None,
        title=l.title,
        description=l.description,
        price=float(l.price),
        condition=l.condition,
        status=l.status,
        type=l.type,
        created_at=l.created_at,
        sold_at=l.sold_at,
    )


@router.get("", response_model=list[ListingOut])
async def list_listings(
    q: str | None = Query(default=None, max_length=100),
    category_id: str | None = None,
    status_filter: str | None = Query(default="ACTIVE", alias="status"),
    min_price: float | None = None,
    max_price: float | None = None,
    limit: int = Query(default=30, le=100),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Listing)
    if status_filter:
        stmt = stmt.where(Listing.status == status_filter)
    if category_id:
        stmt = stmt.where(Listing.category_id == category_id)
    if min_price is not None:
        stmt = stmt.where(Listing.price >= min_price)
    if max_price is not None:
        stmt = stmt.where(Listing.price <= max_price)
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(or_(func.lower(Listing.title).like(like), func.lower(Listing.description).like(like)))
    stmt = stmt.order_by(Listing.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(stmt)
    return [_serialize(l) for l in result.scalars().all()]


@router.post("", response_model=ListingOut, status_code=201)
async def create_listing(
    body: ListingCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.condition not in {"NEW", "LIKE_NEW", "GOOD", "FAIR", "POOR"}:
        raise HTTPException(422, "invalid condition")
    if body.type not in {"SELL", "RENT", "BORROW", "FREE"}:
        raise HTTPException(422, "invalid type")
    l = Listing(
        seller_id=user.id,
        title=body.title.strip(),
        description=body.description.strip(),
        price=body.price,
        category_id=UUID(body.category_id) if body.category_id else None,
        condition=body.condition,
        type=body.type,
        status="ACTIVE",
    )
    db.add(l)
    await db.commit()
    await db.refresh(l)
    return _serialize(l)


@router.get("/{listing_id}", response_model=ListingOut)
async def get_listing(listing_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Listing).where(Listing.id == listing_id))
    l = result.scalar_one_or_none()
    if l is None:
        raise HTTPException(404, "listing not found")
    return _serialize(l)


@router.patch("/{listing_id}", response_model=ListingOut)
async def update_listing(
    listing_id: UUID,
    body: ListingUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Listing).where(Listing.id == listing_id))
    l = result.scalar_one_or_none()
    if l is None:
        raise HTTPException(404, "listing not found")
    if l.seller_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "not your listing")
    data = body.model_dump(exclude_unset=True)
    if "condition" in data and data["condition"] not in {"NEW", "LIKE_NEW", "GOOD", "FAIR", "POOR"}:
        raise HTTPException(422, "invalid condition")
    if "type" in data and data["type"] not in {"SELL", "RENT", "BORROW", "FREE"}:
        raise HTTPException(422, "invalid type")
    if "category_id" in data and data["category_id"]:
        data["category_id"] = UUID(data["category_id"])
    for k, v in data.items():
        setattr(l, k, v)
    await db.commit()
    await db.refresh(l)
    return _serialize(l)


@router.delete("/{listing_id}", status_code=204)
async def delete_listing(
    listing_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Listing).where(Listing.id == listing_id))
    l = result.scalar_one_or_none()
    if l is None:
        raise HTTPException(404, "listing not found")
    if l.seller_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "not your listing")
    await db.delete(l)
    await db.commit()
    return None


@router.post("/{listing_id}/sold", response_model=ListingOut)
async def mark_sold(
    listing_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from datetime import datetime, timezone
    result = await db.execute(select(Listing).where(Listing.id == listing_id))
    l = result.scalar_one_or_none()
    if l is None:
        raise HTTPException(404, "listing not found")
    if l.seller_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "not your listing")
    l.status = "SOLD"
    l.sold_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(l)
    return _serialize(l)

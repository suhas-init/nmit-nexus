from datetime import datetime
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.wanted import WantedPost, WantedBid

router = APIRouter(prefix="/wanted", tags=["wanted"])

CONDITIONS = {"NEW", "LIKE_NEW", "GOOD", "FAIR", "POOR"}


class WantedCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=5, max_length=2000)
    max_price: float = Field(gt=0)
    category_id: str | None = None
    min_condition: str = "GOOD"
    deadline: datetime | None = None


class BidCreate(BaseModel):
    bid_price: float = Field(gt=0)
    message: str | None = Field(default=None, max_length=500)


def _wanted_out(w: WantedPost) -> dict:
    return {
        "id": str(w.id),
        "buyer_id": str(w.buyer_id),
        "category_id": str(w.category_id) if w.category_id else None,
        "title": w.title,
        "description": w.description,
        "max_price": float(w.max_price),
        "min_condition": w.min_condition,
        "deadline": w.deadline,
        "status": w.status,
        "created_at": w.created_at,
    }


def _bid_out(b: WantedBid) -> dict:
    return {
        "id": str(b.id),
        "wanted_post_id": str(b.wanted_post_id),
        "seller_id": str(b.seller_id),
        "bid_price": float(b.bid_price),
        "message": b.message,
        "status": b.status,
        "created_at": b.created_at,
    }


@router.get("")
async def list_wanted(
    q: str | None = Query(default=None, max_length=100),
    status_filter: str | None = Query(default="OPEN", alias="status"),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(WantedPost)
    if status_filter:
        stmt = stmt.where(WantedPost.status == status_filter)
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(or_(func.lower(WantedPost.title).like(like), func.lower(WantedPost.description).like(like)))
    stmt = stmt.order_by(WantedPost.created_at.desc()).limit(50)
    res = await db.execute(stmt)
    return [_wanted_out(w) for w in res.scalars().all()]


@router.post("", status_code=201)
async def create_wanted(
    body: WantedCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.min_condition not in CONDITIONS:
        raise HTTPException(422, "invalid condition")
    w = WantedPost(
        buyer_id=user.id,
        title=body.title.strip(),
        description=body.description.strip(),
        max_price=body.max_price,
        category_id=UUID(body.category_id) if body.category_id else None,
        min_condition=body.min_condition,
        deadline=body.deadline,
        status="OPEN",
    )
    db.add(w)
    await db.commit()
    await db.refresh(w)
    return _wanted_out(w)


@router.get("/{wanted_id}")
async def get_wanted(wanted_id: UUID, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(WantedPost).where(WantedPost.id == wanted_id))
    w = res.scalar_one_or_none()
    if w is None:
        raise HTTPException(404, "wanted post not found")
    return _wanted_out(w)


@router.post("/{wanted_id}/bids", status_code=201)
async def create_bid(
    wanted_id: UUID,
    body: BidCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(WantedPost).where(WantedPost.id == wanted_id))
    w = res.scalar_one_or_none()
    if w is None:
        raise HTTPException(404, "wanted post not found")
    if w.buyer_id == user.id:
        raise HTTPException(400, "cannot bid on your own wanted post")
    if w.status != "OPEN":
        raise HTTPException(400, "this wanted post is closed")

    b = WantedBid(
        wanted_post_id=w.id,
        seller_id=user.id,
        bid_price=body.bid_price,
        message=body.message,
        status="PENDING",
    )
    db.add(b)
    await db.commit()
    await db.refresh(b)
    return _bid_out(b)


@router.get("/{wanted_id}/bids")
async def list_bids(
    wanted_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(WantedPost).where(WantedPost.id == wanted_id))
    w = res.scalar_one_or_none()
    if w is None:
        raise HTTPException(404, "wanted post not found")
    if w.buyer_id != user.id:
        raise HTTPException(403, "only the buyer can see all bids")

    res = await db.execute(
        select(WantedBid).where(WantedBid.wanted_post_id == wanted_id).order_by(WantedBid.bid_price.asc())
    )
    return [_bid_out(b) for b in res.scalars().all()]


@router.patch("/bids/{bid_id}")
async def respond_bid(
    bid_id: UUID,
    action: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(WantedBid).where(WantedBid.id == bid_id))
    b = res.scalar_one_or_none()
    if b is None:
        raise HTTPException(404, "bid not found")

    wres = await db.execute(select(WantedPost).where(WantedPost.id == b.wanted_post_id))
    w = wres.scalar_one_or_none()
    if w is None:
        raise HTTPException(404, "wanted post not found")
    if w.buyer_id != user.id:
        raise HTTPException(403, "only the buyer can respond")
    if action not in {"accept", "reject"}:
        raise HTTPException(422, "action must be accept or reject")

    b.status = "ACCEPTED" if action == "accept" else "REJECTED"
    if action == "accept":
        w.status = "FULFILLED"
    await db.commit()
    await db.refresh(b)
    return _bid_out(b)

import secrets
import hashlib
from datetime import datetime, timezone
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.listing import Listing
from app.models.conversation import Offer
from app.models.handover import Handover

router = APIRouter(prefix="/handovers", tags=["handovers"])


def _new_token() -> str:
    return secrets.token_hex(3).upper()  # 6 hex chars, e.g. "A3F91C"


class ConfirmIn(BaseModel):
    role: str  # "seller" or "buyer"
    token: str


def _serialize(h: Handover, viewer: User, offer: Offer, listing: Listing) -> dict:
    return {
        "id": str(h.id),
        "offer_id": str(h.offer_id),
        "listing_id": str(listing.id),
        "listing_title": listing.title,
        "seller_id": str(offer.seller_id),
        "buyer_id": str(offer.buyer_id),
        "seller_token": h.seller_token if viewer.id == offer.seller_id else None,
        "buyer_token": h.buyer_token if viewer.id == offer.buyer_id else None,
        "seller_confirmed": h.seller_confirmed_at is not None,
        "buyer_confirmed": h.buyer_confirmed_at is not None,
        "verified": h.verified_at is not None,
        "verified_at": h.verified_at,
        "receipt_hash": h.receipt_hash,
    }


@router.post("/init/{offer_id}", status_code=201)
async def init_handover(
    offer_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ores = await db.execute(select(Offer).where(Offer.id == offer_id))
    offer = ores.scalar_one_or_none()
    if offer is None:
        raise HTTPException(404, "offer not found")
    if user.id not in {offer.seller_id, offer.buyer_id}:
        raise HTTPException(403, "not part of this deal")
    if offer.status != "ACCEPTED":
        raise HTTPException(400, "offer must be accepted first")

    lres = await db.execute(select(Listing).where(Listing.id == offer.listing_id))
    listing = lres.scalar_one_or_none()

    hres = await db.execute(select(Handover).where(Handover.offer_id == offer.id))
    existing = hres.scalar_one_or_none()
    if existing:
        return _serialize(existing, user, offer, listing)

    h = Handover(offer_id=offer.id, seller_token=_new_token(), buyer_token=_new_token())
    db.add(h)
    await db.commit()
    await db.refresh(h)
    return _serialize(h, user, offer, listing)


@router.get("/{offer_id}")
async def get_handover(
    offer_id: UUID,
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
    if h is None:
        raise HTTPException(404, "handover not started")

    lres = await db.execute(select(Listing).where(Listing.id == offer.listing_id))
    listing = lres.scalar_one_or_none()
    return _serialize(h, user, offer, listing)


@router.post("/{offer_id}/confirm")
async def confirm_handover(
    offer_id: UUID,
    body: ConfirmIn,
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
    if h is None:
        raise HTTPException(404, "handover not started")
    if h.verified_at is not None:
        raise HTTPException(400, "handover already verified")

    if body.role not in {"seller", "buyer"}:
        raise HTTPException(422, "role must be seller or buyer")
    # The confirming user must match the role
    if body.role == "seller" and user.id != offer.seller_id:
        raise HTTPException(403, "not the seller")
    if body.role == "buyer" and user.id != offer.buyer_id:
        raise HTTPException(403, "not the buyer")

    # A seller confirms the buyer's token; a buyer confirms the seller's token
    expected = h.buyer_token if body.role == "seller" else h.seller_token
    if body.token.strip().upper() != expected.upper():
        raise HTTPException(400, "wrong handover code")

    now = datetime.now(timezone.utc)
    if body.role == "seller":
        h.seller_confirmed_at = now
    else:
        h.buyer_confirmed_at = now

    if h.seller_confirmed_at and h.buyer_confirmed_at:
        h.verified_at = now
        payload = f"{offer.id}:{h.seller_token}:{h.buyer_token}:{now.isoformat()}".encode()
        h.receipt_hash = hashlib.sha256(payload).hexdigest()
        lres = await db.execute(select(Listing).where(Listing.id == offer.listing_id))
        listing = lres.scalar_one_or_none()
        if listing:
            listing.status = "SOLD"
            listing.sold_at = now
        offer.status = "COMPLETED"
        # bump seller/buyer stats
        sres = await db.execute(select(User).where(User.id == offer.seller_id))
        seller = sres.scalar_one_or_none()
        bres = await db.execute(select(User).where(User.id == offer.buyer_id))
        buyer = bres.scalar_one_or_none()
        if seller:
            seller.completed_transactions = (seller.completed_transactions or 0) + 1
        if buyer:
            buyer.completed_transactions = (buyer.completed_transactions or 0) + 1

    await db.commit()
    await db.refresh(h)
    lres = await db.execute(select(Listing).where(Listing.id == offer.listing_id))
    listing = lres.scalar_one_or_none()
    return _serialize(h, user, offer, listing)

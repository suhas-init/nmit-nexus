from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.listing import Listing
from app.models.user import User
from app.models.conversation import Conversation, Message, Offer
from app.schemas.offer import ConversationOut, MessageCreate, MessageOut, OfferCreate, OfferOut
from app.ws.manager import manager
from app.services.notification import notify

router = APIRouter(tags=["offers"])


def _offer_out(o: Offer) -> OfferOut:
    return OfferOut(
        id=str(o.id), listing_id=str(o.listing_id), buyer_id=str(o.buyer_id),
        seller_id=str(o.seller_id), offer_price=float(o.offer_price),
        message=o.message, status=o.status, created_at=o.created_at,
    )


def _conv_out(c: Conversation) -> ConversationOut:
    return ConversationOut(
        id=str(c.id), listing_id=str(c.listing_id),
        buyer_id=str(c.buyer_id), seller_id=str(c.seller_id),
        last_message_at=c.last_message_at,
    )


def _msg_out(m: Message) -> MessageOut:
    return MessageOut(
        id=str(m.id), conversation_id=str(m.conversation_id),
        sender_id=str(m.sender_id), message_type=m.message_type,
        body=m.body, created_at=m.created_at,
    )


@router.post("/listings/{listing_id}/offers", response_model=OfferOut, status_code=201)
async def create_offer(
    listing_id: UUID,
    body: OfferCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Listing).where(Listing.id == listing_id))
    listing = res.scalar_one_or_none()
    if listing is None:
        raise HTTPException(404, "listing not found")
    if listing.seller_id == user.id:
        raise HTTPException(400, "cannot offer on your own listing")
    if listing.status == "SOLD":
        raise HTTPException(400, "listing already sold")

    offer = Offer(
        listing_id=listing.id, buyer_id=user.id, seller_id=listing.seller_id,
        offer_price=body.offer_price, message=body.message, status="PENDING",
    )
    db.add(offer)

    conv_res = await db.execute(select(Conversation).where(
        Conversation.listing_id == listing.id,
        Conversation.buyer_id == user.id,
    ))
    conv = conv_res.scalar_one_or_none()
    if conv is None:
        conv = Conversation(listing_id=listing.id, buyer_id=user.id, seller_id=listing.seller_id)
        db.add(conv)
        await db.flush()
    msg = Message(
        conversation_id=conv.id, sender_id=user.id, message_type="OFFER",
        body=f"Offered ₹{body.offer_price:.0f}" + (f" — {body.message}" if body.message else ""),
    )
    db.add(msg)
    await db.commit()
    await db.refresh(offer)
    await notify(db, str(listing.seller_id), "offer.created", {
        "title": f"New offer on {listing.title}",
        "body": f"₹{float(offer.offer_price):.0f}",
        "href": "/offers",
        "offer_id": str(offer.id),
    })
    await db.commit()
    return _offer_out(offer)


@router.get("/listings/{listing_id}/offers", response_model=list[OfferOut])
async def list_offers(
    listing_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Listing).where(Listing.id == listing_id))
    listing = res.scalar_one_or_none()
    if listing is None:
        raise HTTPException(404, "listing not found")
    if listing.seller_id != user.id and listing.id is None:
        raise HTTPException(403, "not allowed")

    q = select(Offer).where(Offer.listing_id == listing_id)
    if listing.seller_id != user.id:
        q = q.where(Offer.buyer_id == user.id)
    q = q.order_by(Offer.created_at.desc())
    res = await db.execute(q)
    return [_offer_out(o) for o in res.scalars().all()]


@router.patch("/offers/{offer_id}", response_model=OfferOut)
async def update_offer(
    offer_id: UUID,
    action: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Offer).where(Offer.id == offer_id))
    offer = res.scalar_one_or_none()
    if offer is None:
        raise HTTPException(404, "offer not found")
    if offer.seller_id != user.id:
        raise HTTPException(403, "only seller can respond")
    if action not in {"accept", "reject"}:
        raise HTTPException(422, "action must be accept or reject")
    offer.status = "ACCEPTED" if action == "accept" else "REJECTED"
    if action == "accept":
        lres = await db.execute(select(Listing).where(Listing.id == offer.listing_id))
        listing = lres.scalar_one_or_none()
        if listing:
            listing.status = "RESERVED"
    await db.commit()
    await db.refresh(offer)
    await manager.send_to_user(str(offer.buyer_id), {
        "type": "offer.updated",
        "offer_id": str(offer.id),
        "status": offer.status,
    })
    return _offer_out(offer)


@router.get("/conversations/enriched")
async def list_conversations_enriched(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(Conversation).where(
            or_(Conversation.buyer_id == user.id, Conversation.seller_id == user.id)
        ).order_by(Conversation.last_message_at.desc())
    )
    convs = res.scalars().all()
    out = []
    for c in convs:
        other_id = c.seller_id if c.buyer_id == user.id else c.buyer_id
        ures = await db.execute(select(User).where(User.id == other_id))
        other = ures.scalar_one_or_none()
        lres = await db.execute(select(Listing).where(Listing.id == c.listing_id))
        listing = lres.scalar_one_or_none()
        mres = await db.execute(
            select(Message).where(Message.conversation_id == c.id)
            .order_by(Message.created_at.desc()).limit(1)
        )
        latest = mres.scalar_one_or_none()
        out.append({
            "id": str(c.id),
            "listing_id": str(c.listing_id),
            "listing_title": listing.title if listing else None,
            "latest_message": latest.body if latest else None,
            "latest_message_type": latest.message_type if latest else None,
            "latest_sender_id": str(latest.sender_id) if latest else None,
            "buyer_id": str(c.buyer_id),
            "seller_id": str(c.seller_id),
            "last_message_at": c.last_message_at.isoformat(),
            "with_user": {
                "id": str(other.id) if other else None,
                "name": other.name if other else "Unknown",
                "avatar_url": other.avatar_url if other else None,
                "campus_verified": other.campus_verified if other else False,
            },
            "i_am_buyer": c.buyer_id == user.id,
        })
    return out


@router.get("/conversations", response_model=list[ConversationOut])
async def list_conversations(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(Conversation).where(
            or_(Conversation.buyer_id == user.id, Conversation.seller_id == user.id)
        ).order_by(Conversation.last_message_at.desc())
    )
    return [_conv_out(c) for c in res.scalars().all()]


@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageOut])
async def list_messages(
    conversation_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cres = await db.execute(select(Conversation).where(Conversation.id == conversation_id))
    conv = cres.scalar_one_or_none()
    if conv is None:
        raise HTTPException(404, "conversation not found")
    if user.id not in {conv.buyer_id, conv.seller_id}:
        raise HTTPException(403, "not in this conversation")
    res = await db.execute(
        select(Message).where(Message.conversation_id == conversation_id).order_by(Message.created_at.asc())
    )
    return [_msg_out(m) for m in res.scalars().all()]


@router.post("/conversations/{conversation_id}/messages", response_model=MessageOut, status_code=201)
async def send_message(
    conversation_id: UUID,
    body: MessageCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cres = await db.execute(select(Conversation).where(Conversation.id == conversation_id))
    conv = cres.scalar_one_or_none()
    if conv is None:
        raise HTTPException(404, "conversation not found")
    if user.id not in {conv.buyer_id, conv.seller_id}:
        raise HTTPException(403, "not in this conversation")
    msg = Message(conversation_id=conversation_id, sender_id=user.id, message_type="TEXT", body=body.body)
    db.add(msg)
    from datetime import datetime, timezone
    conv.last_message_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(msg)
    recipient = conv.seller_id if user.id == conv.buyer_id else conv.buyer_id
    await notify(db, str(recipient), "message.created", {
        "title": "New message",
        "href": f"/conversations/{conversation_id}",
        "conversation_id": str(conversation_id),
    })
    await db.commit()
    return _msg_out(msg)

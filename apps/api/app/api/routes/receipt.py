from io import BytesIO
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas
from reportlab.lib.utils import simpleSplit

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.listing import Listing
from app.models.conversation import Offer
from app.models.handover import Handover

router = APIRouter(prefix="/receipt", tags=["receipt"])


def _pdf_bytes(
    *,
    receipt_hash: str,
    verified_at: datetime,
    seller_name: str,
    buyer_name: str,
    listing_title: str,
    listing_desc: str,
    amount: float,
    offer_id: str,
) -> bytes:
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    W, H = A4

    # Background
    c.setFillColor(HexColor("#0A0E14"))
    c.rect(0, 0, W, H, fill=1, stroke=0)

    # Top gold bar
    c.setFillColor(HexColor("#F2B705"))
    c.rect(0, H - 8*mm, W, 8*mm, fill=1, stroke=0)

    # Brand
    c.setFillColor(HexColor("#F2B705"))
    c.setFont("Helvetica-Bold", 22)
    c.drawString(20*mm, H - 25*mm, "NMIT NEXUS")

    c.setFillColor(HexColor("#6B7280"))
    c.setFont("Helvetica", 9)
    c.drawString(20*mm, H - 32*mm, "CAMPUS COMMERCE OS · VERIFIED HANDOVER RECEIPT")

    # Big title
    c.setFillColor(HexColor("#F5F7FA"))
    c.setFont("Helvetica-Bold", 32)
    c.drawString(20*mm, H - 55*mm, "TRANSACTION RECEIPT")

    # Divider
    c.setStrokeColor(HexColor("#1C1F25"))
    c.setLineWidth(1)
    c.line(20*mm, H - 62*mm, W - 20*mm, H - 62*mm)

    # Details
    y = H - 75*mm
    left_x = 20*mm
    right_x = 110*mm

    def label(x, y, text):
        c.setFillColor(HexColor("#6B7280"))
        c.setFont("Helvetica", 8)
        c.drawString(x, y, text.upper())

    def value(x, y, text, color="#F5F7FA", size=12):
        c.setFillColor(HexColor(color))
        c.setFont("Helvetica-Bold", size)
        c.drawString(x, y, text)

    label(left_x, y, "Listing")
    value(left_x, y - 6*mm, listing_title[:45])
    y -= 20*mm

    # Description
    label(left_x, y, "Description")
    c.setFillColor(HexColor("#A6ADB8"))
    c.setFont("Helvetica", 10)
    lines = simpleSplit(listing_desc[:400], "Helvetica", 10, 75*mm)
    for i, line in enumerate(lines[:3]):
        c.drawString(left_x, y - 6*mm - i * 5*mm, line)
    y -= 30*mm

    label(left_x, y, "Seller")
    value(left_x, y - 6*mm, seller_name)

    label(right_x, y, "Buyer")
    value(right_x, y - 6*mm, buyer_name)
    y -= 20*mm

    label(left_x, y, "Amount paid")
    c.setFillColor(HexColor("#F2B705"))
    c.setFont("Helvetica-Bold", 22)
    c.drawString(left_x, y - 10*mm, f"INR {amount:,.0f}")

    label(right_x, y, "Verified at")
    value(right_x, y - 6*mm, verified_at.strftime("%d %b %Y, %H:%M UTC"))
    y -= 30*mm

    # Verification block
    c.setFillColor(HexColor("#11161F"))
    c.rect(20*mm, y - 40*mm, W - 40*mm, 40*mm, fill=1, stroke=0)
    c.setStrokeColor(HexColor("#1C1F25"))
    c.rect(20*mm, y - 40*mm, W - 40*mm, 40*mm, fill=0, stroke=1)

    c.setFillColor(HexColor("#22C55E"))
    c.setFont("Helvetica-Bold", 11)
    c.drawString(24*mm, y - 10*mm, "VERIFIED BY MUTUAL QR HANDSHAKE")

    c.setFillColor(HexColor("#6B7280"))
    c.setFont("Helvetica", 7)
    c.drawString(24*mm, y - 18*mm, "RECEIPT HASH (SHA-256)")

    c.setFillColor(HexColor("#A6ADB8"))
    c.setFont("Courier", 9)
    # wrap hash
    h = receipt_hash
    c.drawString(24*mm, y - 24*mm, h[:48])
    c.drawString(24*mm, y - 30*mm, h[48:])

    # Footer
    c.setFillColor(HexColor("#6B7280"))
    c.setFont("Helvetica", 8)
    c.drawString(20*mm, 20*mm, "NMIT Nexus · Student project · Not officially affiliated with Nitte Meenakshi Institute of Technology")
    c.setFont("Courier", 7)
    c.setFillColor(HexColor("#52525B"))
    c.drawString(20*mm, 14*mm, f"OFFER_ID {offer_id}")

    c.showPage()
    c.save()
    return buf.getvalue()


@router.get("/{offer_id}.pdf")
async def download_receipt(
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
    if h is None or h.verified_at is None:
        raise HTTPException(400, "handover not verified yet")

    lres = await db.execute(select(Listing).where(Listing.id == offer.listing_id))
    listing = lres.scalar_one_or_none()

    sres = await db.execute(select(User).where(User.id == offer.seller_id))
    seller = sres.scalar_one_or_none()
    bres = await db.execute(select(User).where(User.id == offer.buyer_id))
    buyer = bres.scalar_one_or_none()

    pdf = _pdf_bytes(
        receipt_hash=h.receipt_hash or "",
        verified_at=h.verified_at,
        seller_name=seller.name if seller else "Unknown",
        buyer_name=buyer.name if buyer else "Unknown",
        listing_title=listing.title if listing else "Listing",
        listing_desc=listing.description if listing else "",
        amount=float(offer.offer_price),
        offer_id=str(offer_id),
    )

    return StreamingResponse(
        BytesIO(pdf),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="nmit-nexus-receipt-{offer_id}.pdf"'},
    )

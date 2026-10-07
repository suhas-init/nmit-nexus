from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.listing import Listing

router = APIRouter(prefix="/price-pulse", tags=["price-pulse"])


@router.get("/{listing_id}")
async def price_pulse(listing_id: UUID, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Listing).where(Listing.id == listing_id))
    target = res.scalar_one_or_none()
    if target is None:
        raise HTTPException(404, "listing not found")

    # comparable listings: same category, active or sold, not this listing
    stmt = select(Listing.price).where(
        Listing.id != target.id,
        Listing.price > 0,
    )
    if target.category_id:
        stmt = stmt.where(Listing.category_id == target.category_id)
    else:
        # fallback: keyword overlap on title's first word
        first_word = target.title.split()[0].lower() if target.title else ""
        if first_word:
            stmt = stmt.where(func.lower(Listing.title).like(f"%{first_word}%"))

    res = await db.execute(stmt)
    prices = sorted(float(p) for (p,) in res.all() if p is not None)

    if len(prices) < 3:
        return {
            "verdict": "unknown",
            "message": "Not enough comparable listings yet to estimate a fair price.",
            "sample_size": len(prices),
        }

    # Trim outliers (remove top and bottom 10% when enough data)
    trimmed = prices
    if len(prices) >= 6:
        cut = max(1, int(len(prices) * 0.1))
        trimmed = prices[cut:-cut] or prices

    mid = len(trimmed) // 2
    if len(trimmed) % 2:
        median = trimmed[mid]
    else:
        median = (trimmed[mid - 1] + trimmed[mid]) / 2

    p25 = trimmed[int(len(trimmed) * 0.25)]
    p75 = trimmed[int(len(trimmed) * 0.75)]
    target_price = float(target.price)

    if target_price < median * 0.85:
        verdict = "cheap"
        label = "Below campus range — a good deal"
    elif target_price > median * 1.15:
        verdict = "expensive"
        label = "Above campus range — consider negotiating"
    else:
        verdict = "fair"
        label = "Within the fair campus range"

    return {
        "verdict": verdict,
        "label": label,
        "target_price": target_price,
        "median": round(median, 2),
        "range_low": round(p25, 2),
        "range_high": round(p75, 2),
        "sample_size": len(trimmed),
    }

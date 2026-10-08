import asyncio
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.models.listing import Listing
from app.models.category import Category
from app.models.listing_image import ListingImage
from sqlalchemy import select

IMG = lambda id: f"https://images.unsplash.com/{id}?w=800&q=80&auto=format"

ITEMS = [
    ("priya",  "FREE — Engineering Maths Notes (xerox)", "Full semester notes, hand-written. Free to any junior who needs them. Pick up from library entrance.", 0, "GOOD", "academics", IMG("photo-1519681393784-d120267933ba"), "FREE"),
    ("rohan",  "FREE — Jumper Wires + Breadboard", "Extra jumper wires and a breadboard. No longer needed. Free for any ECE/CSE first-year.", 0, "GOOD", "lab-kits", IMG("photo-1553406830-ef2513450d76"), "FREE"),
    ("kabir",  "FREE — Old Cycle Helmet (size M)", "Helmet is 3 years old but structurally sound. Free — just come pick it up.", 0, "FAIR", "cycles", IMG("photo-1553978297-833d09932d31"), "FREE"),
    ("saanvi", "BORROW — Umbrella for Monsoon", "Borrow my extra umbrella for a week. Just return it in one piece.", 0, "GOOD", "misc", IMG("photo-1534361960057-19889db9621e"), "BORROW"),
    ("diya",   "BORROW — Physics Lab Coat (size M)", "Lab coat I only use during labs. Happy to lend between 9am–5pm on weekdays.", 0, "GOOD", "academics", IMG("photo-1581093450021-4a7360e9a6b5"), "BORROW"),
    ("vihaan", "RENT — Casio FX-991CW for Exams (₹50/week)", "My spare calculator. Available for rent during exams. Deposit ₹500, refunded on return.", 50, "GOOD", "calculators", IMG("photo-1587145820266-a5951ee6f620"), "RENT"),
    ("kabir",  "RENT — Btwin Cycle for a Month", "Going home for a month. Renting out my cycle so it's not idle. ₹400/month.", 400, "GOOD", "cycles", IMG("photo-1485965120184-e220f721d03e"), "RENT"),
]

async def run():
    async with AsyncSessionLocal() as db:
        users = {}
        for p in ["priya","rohan","kabir","saanvi","diya","vihaan"]:
            r = await db.execute(select(User).where(User.email.like(f"{p}.p@%")))
            u = r.scalar_one_or_none()
            if u: users[p] = u
        cats_res = await db.execute(select(Category))
        cats = {c.slug: c.id for c in cats_res.scalars().all()}

        n = 0
        for key, title, desc, price, cond, slug, img, kind in ITEMS:
            u = users.get(key)
            if not u: continue
            ex = await db.execute(select(Listing).where(Listing.title == title))
            if ex.scalar_one_or_none(): continue
            L = Listing(seller_id=u.id, category_id=cats.get(slug), title=title, description=desc, price=price, condition=cond, status="ACTIVE", type=kind)
            db.add(L); await db.flush()
            db.add(ListingImage(listing_id=L.id, storage_key=img, sort_order=0))
            n += 1
        await db.commit()
        print(f"✓ added {n} community listings (FREE / BORROW / RENT)")

if __name__ == "__main__":
    asyncio.run(run())

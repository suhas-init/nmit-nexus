import asyncio
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.models.wanted import WantedPost
from app.models.category import Category
from sqlalchemy import select

WANTED = [
    # buyer_key, title, description, max_price, min_condition, category_slug
    ("priya",  "Casio FX-991CW Scientific Calculator", "Need it for the maths exam next week. Any condition as long as keys work.", 900, "FAIR", "calculators"),
    ("rohan",  "RTX 3060 GPU", "Building a budget gaming rig. Under warranty strongly preferred.", 18000, "GOOD", "electronics"),
    ("ananya", "Engineering Mathematics — B.S. Grewal 44th Ed", "First-year prep. Happy to pay full price if it's clean.", 400, "GOOD", "books"),
    ("ishita", "iPad 9th Gen or 10th Gen", "For notes and PDFs. Any storage. Pencil would be a bonus.", 20000, "GOOD", "electronics"),
    ("kabir",  "Cycle Lock — Heavy Duty", "Need a proper lock for my cycle. Combination or key both fine.", 400, "GOOD", "cycles"),
    ("saanvi", "Hostel Iron Box", "Moving in next week, need an iron. Working condition only.", 500, "FAIR", "hostel-furniture"),
    ("diya",   "Mini Drafter + Drawing Board", "First-year engineering drawing kit. Complete set only.", 350, "FAIR", "academics"),
    ("arjun",  "Yonex Badminton Racket", "Beginner-friendly. Doesn't need to be top model.", 1000, "GOOD", "sports"),
    ("vihaan", "Arduino Uno + Sensors Kit", "Starting a robotics mini project. Full kit preferred.", 1200, "GOOD", "lab-kits"),
    ("priya",  "Hostel Table Lamp — LED", "Move-in next week. Any adjustable LED lamp works.", 350, "GOOD", "hostel-furniture"),
    ("rohan",  "Raspberry Pi 4 — 4GB or 8GB", "Need it for a computer vision project.", 5000, "GOOD", "lab-kits"),
    ("ananya", "GDG DevFest 2024 Hoodie — Size M", "Missed the event. Will pay good for one.", 800, "LIKE_NEW", "event-merch"),
    ("ishita", "Sony WH-1000XM4 or XM5", "Bought by any recent owner. Under 1 year preferred.", 15000, "GOOD", "electronics"),
    ("kabir",  "Weighted Skipping Rope", "For daily workout. Rubber handles preferred.", 250, "GOOD", "sports"),
    ("saanvi", "Bookshelf — 3 or 4 tier", "Need one for my hostel room. Metal or wood both fine.", 1000, "FAIR", "hostel-furniture"),
]

async def run():
    async with AsyncSessionLocal() as db:
        users = {}
        for p in ["priya","rohan","ananya","ishita","kabir","saanvi","diya","arjun","vihaan"]:
            r = await db.execute(select(User).where(User.email.like(f"{p}.p@%")))
            u = r.scalar_one_or_none()
            if u: users[p] = u
        cats_res = await db.execute(select(Category))
        cats = {c.slug: c.id for c in cats_res.scalars().all()}

        n = 0
        for key, title, desc, price, cond, slug in WANTED:
            u = users.get(key)
            if not u: continue
            ex = await db.execute(select(WantedPost).where(WantedPost.title == title))
            if ex.scalar_one_or_none(): continue
            db.add(WantedPost(
                buyer_id=u.id, category_id=cats.get(slug),
                title=title, description=desc,
                max_price=price, min_condition=cond,
                status="OPEN",
            ))
            n += 1
        await db.commit()
        print(f"✓ added {n} wanted posts")

if __name__ == "__main__":
    asyncio.run(run())

import asyncio, os, sys
from app.db.session import AsyncSessionLocal
from app.core.security import hash_password
from app.models.user import User
from app.models.listing import Listing
from app.models.category import Category
from app.models.listing_image import ListingImage
from sqlalchemy import select

IMG = lambda id: f"https://images.unsplash.com/{id}?w=800&q=80&auto=format"

PERSONAS = [
    {"name": "Aarav Sharma",   "email": "aarav.p@nmit.ac.in",   "dept": "CSE",  "bio": "Final year CSE. Selling off my gear before moving to Bengaluru. Everything used with care.", "avatar": "https://i.pravatar.cc/300?img=12"},
    {"name": "Priya Reddy",    "email": "priya.p@nmit.ac.in",   "dept": "ISE",  "bio": "3rd year ISE. Love a good deal. Selling textbooks I've outgrown + a few hostel extras.", "avatar": "https://i.pravatar.cc/300?img=45"},
    {"name": "Rohan Kumar",    "email": "rohan.p@nmit.ac.in",   "dept": "ECE",  "bio": "ECE, robotics club. Selling Arduinos, sensors and project leftovers.", "avatar": "https://i.pravatar.cc/300?img=33"},
    {"name": "Ananya Iyer",    "email": "ananya.p@nmit.ac.in",  "dept": "AIML", "bio": "AIML. Trading books and stationery. Ping me for anything academic.", "avatar": "https://i.pravatar.cc/300?img=47"},
    {"name": "Kabir Nair",     "email": "kabir.p@nmit.ac.in",   "dept": "MECH", "bio": "Mech. Cycle enthusiast. Selling my spare Hero Sprint before graduation.", "avatar": "https://i.pravatar.cc/300?img=15"},
    {"name": "Diya Menon",     "email": "diya.p@nmit.ac.in",    "dept": "CIVIL","bio": "Civil. Clean, honest listings. Pickup from B-block hostel.", "avatar": "https://i.pravatar.cc/300?img=49"},
    {"name": "Vihaan Patel",   "email": "vihaan.p@nmit.ac.in",  "dept": "CSE",  "bio": "CSE. Selling my iPad + Apple Pencil. Perfect for notes.", "avatar": "https://i.pravatar.cc/300?img=13"},
    {"name": "Ishita Verma",   "email": "ishita.p@nmit.ac.in",  "dept": "AIML", "bio": "AIML final year. Deals on electronics this month. Meet at Library Entrance.", "avatar": "https://i.pravatar.cc/300?img=44"},
    {"name": "Arjun Rao",      "email": "arjun.p@nmit.ac.in",   "dept": "ECE",  "bio": "ECE. Trading sports gear and fitness gear since I moved out of hostel.", "avatar": "https://i.pravatar.cc/300?img=8"},
    {"name": "Saanvi Joshi",   "email": "saanvi.p@nmit.ac.in",  "dept": "ISE",  "bio": "ISE. Hostel move-out sale — everything must go.", "avatar": "https://i.pravatar.cc/300?img=32"},
]

LISTINGS = [
    # (email key, title, description, price, condition, cat_slug, image_url, sold)
    ("aarav", "Casio FX-991CW Scientific Calculator", "Bought first year, well maintained. Keys work perfectly, cover has minor scuffs. Bill available.", 850, "GOOD", "calculators", IMG("photo-1600952670577-c6d5c04be2e3"), False),
    ("aarav", "Dell Inspiron 15 — i5 11th Gen, 8GB/512GB", "Two years old. Battery lasts ~4 hours. Windows 11. Backlit keyboard. No dents.", 32000, "GOOD", "electronics", IMG("photo-1496181133206-80ce9b88a853"), False),
    ("vihaan", "iPad 9th Gen 64GB WiFi + Apple Pencil 1", "Space grey. Comes with folio case and Pencil 1st gen. Screen flawless. Perfect for notes.", 22000, "LIKE_NEW", "electronics", IMG("photo-1544244015-0df4b3ffc6b0"), False),
    ("vihaan", "Logitech MX Master 3S — Sealed", "Sealed. Won in a hackathon but I already own one. Box unopened.", 6500, "NEW", "electronics", IMG("photo-1527864550417-7fd91fc51a46"), False),
    ("ishita", "Sony WH-1000XM4 Headphones", "Noise cancelling. Bought 8 months ago. Comes with case and cable. Excellent condition.", 15000, "LIKE_NEW", "electronics", IMG("photo-1505740420928-5e560c06d30e"), False),
    ("ishita", "Engineering Mathematics — B.S. Grewal 44th Ed", "Some highlighting in chapters 1-4. No torn pages. Ideal for first-year prep.", 450, "GOOD", "books", IMG("photo-1544716278-ca5e3f4abd8c"), False),
    ("priya", "Data Structures & Algorithms Made Easy — Karumanchi", "GATE/placement standard. Spine has a slight crease, otherwise clean.", 380, "GOOD", "books", IMG("photo-1519681393784-d120267933ba"), False),
    ("ananya", "Engineering Drawing Kit — Mini Drafter + Board", "Complete set. Drafter, drawing board, clips, set squares. First-year kit.", 550, "GOOD", "books", IMG("photo-1589998059171-988d887df646"), False),
    ("rohan", "Arduino Uno R3 Starter Kit", "Complete kit — breadboard, jumpers, LEDs, resistors, ultrasonic sensor, servo. Used for one mini project.", 1200, "LIKE_NEW", "lab-kits", IMG("photo-1553406830-ef2513450d76"), False),
    ("rohan", "Raspberry Pi 4 Model B — 4GB", "Bought last semester for a project. Comes with official PSU and 32GB SD card.", 5500, "GOOD", "lab-kits", IMG("photo-1580584126903-c17d41830450"), False),
    ("kabir", "Hero Sprint 26T Cycle", "Well maintained, recently serviced. New tyres and brake pads. Ideal for campus commute.", 4500, "GOOD", "cycles", IMG("photo-1485965120184-e220f721d03e"), False),
    ("kabir", "Btwin Rockrider MTB — 21 Speed", "Mountain bike, 21 gears. Minor scratches from use. Serviced last month.", 8500, "GOOD", "cycles", IMG("photo-1571068316344-75bc76f77890"), True),
    ("diya", "Hostel Study Table — Wooden, 3x2 ft", "Sturdy wooden table with drawer. Move-out sale. Pickup from B-block hostel.", 1500, "FAIR", "hostel-furniture", IMG("photo-1593062096033-9a26b09da705"), False),
    ("diya", "Study Lamp — LED, adjustable arm", "Warm white LED. Adjustable arm, USB charging port on base. Works perfectly.", 400, "GOOD", "hostel-furniture", IMG("photo-1507473885765-e6ed057f782c"), False),
    ("saanvi", "Hostel Mattress — Single Bed 3in Foam", "Sleepwell 3-inch foam mattress. 1 year old. Clean, no stains.", 900, "FAIR", "hostel-furniture", IMG("photo-1505693416388-ac5ce068fe85"), False),
    ("saanvi", "Foldable Study Chair", "Metal frame, cushioned seat. Folds flat for storage. Minor wear on armrests.", 800, "FAIR", "hostel-furniture", IMG("photo-1586023492125-27b2c045efd7"), False),
    ("arjun", "Resistance Band Set — 5 Levels", "All five bands + handles + carry bag. Barely used.", 700, "LIKE_NEW", "sports", IMG("photo-1598289431512-b97b0917affc"), False),
    ("arjun", "Yonex Badminton Racket + Cover", "Carbon fibre. Re-gripped last month. Ideal for beginners.", 950, "GOOD", "sports", IMG("photo-1617083934555-ac9f40f4a18e"), False),
    ("priya", "GDG NMIT DevFest 2025 Hoodie — Size M", "Official merch. Worn once. No stains, no fading.", 600, "LIKE_NEW", "event-merch", IMG("photo-1556821840-3a63f95609a7"), True),
    ("ananya", "Noise ColorFit Pro 4 Smartwatch", "1 year old. Heart rate + SpO2. Battery lasts 6 days. Charger included.", 2200, "GOOD", "electronics", IMG("photo-1546868871-7041f2a55e12"), False),
]

async def run():
    async with AsyncSessionLocal() as db:
        # Load categories
        cats_res = await db.execute(select(Category))
        cats = {c.slug: c.id for c in cats_res.scalars().all()}

        # Upsert users
        pwd = hash_password("demo12345")
        users = {}
        for p in PERSONAS:
            key = p["email"].split(".")[0]
            res = await db.execute(select(User).where(User.email == p["email"]))
            u = res.scalar_one_or_none()
            if u is None:
                u = User(
                    name=p["name"], email=p["email"], password_hash=pwd,
                    department=p["dept"], bio=p["bio"], avatar_url=p["avatar"],
                    email_verified=True, campus_verified=True,
                    completed_transactions=2 if key in ("kabir","priya") else 0,
                    avg_rating=4.8 if key == "kabir" else (4.5 if key == "priya" else 0),
                    response_rate=98,
                )
                db.add(u)
                await db.flush()
            else:
                u.avatar_url = p["avatar"]; u.bio = p["bio"]
                u.email_verified = True; u.department = p["dept"]
            users[key] = u
        await db.commit()
        print(f"✓ {len(users)} personas upserted")

        # Listings
        created = 0
        for key, title, desc, price, cond, slug, img, sold in LISTINGS:
            u = users.get(key)
            if not u: continue
            ex = await db.execute(select(Listing).where(Listing.title == title, Listing.seller_id == u.id))
            if ex.scalar_one_or_none(): continue
            L = Listing(
                seller_id=u.id, category_id=cats.get(slug),
                title=title, description=desc, price=price, condition=cond,
                status="SOLD" if sold else "ACTIVE", type="SELL",
            )
            db.add(L); await db.flush()
            db.add(ListingImage(listing_id=L.id, storage_key=img, sort_order=0))
            created += 1
        await db.commit()
        print(f"✓ {created} listings created")
        print("\nAll personas → password: demo12345")

if __name__ == "__main__":
    asyncio.run(run())

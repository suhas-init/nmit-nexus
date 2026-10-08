import asyncio
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.models.listing import Listing
from app.models.category import Category
from app.models.listing_image import ListingImage
from sqlalchemy import select

IMG = lambda id: f"https://images.unsplash.com/{id}?w=800&q=80&auto=format"

# Fix broken images on existing listings
FIX_IMAGE = {
    "Casio FX-991CW Scientific Calculator": IMG("photo-1587145820266-a5951ee6f620"),
}

LISTINGS = [
    # ------- CALCULATORS -------
    ("priya",  "Casio FX-82MS Scientific Calculator", "Classic 2-line display. Every key works. First-year lifesaver. Small scuff on the lid.", 650, "GOOD", "calculators", IMG("photo-1635070041078-e363dbe005cb")),
    ("priya",  "Casio FX-991ES Plus", "Natural display, higher tier than CW. Minor scuff on the back. Ships with hard case.", 1100, "GOOD", "calculators", IMG("photo-1611078703114-54a7d7d34a72")),
    ("rohan",  "Texas Instruments TI-84 Plus CE", "Graphing calculator. Barely used — bought for stats but mostly used Excel. Box + cable.", 4800, "LIKE_NEW", "calculators", IMG("photo-1587145820266-a5951ee6f620")),
    ("ananya", "Casio FX-991CW — Brand New Sealed", "Sealed box, never opened. Won as a prize, I already own one. Full warranty.", 1400, "NEW", "calculators", IMG("photo-1587145820266-a5951ee6f620")),
    ("ishita", "Casio FX-100MS", "Old but rock solid. Display clear, keys tactile. Selling because upgraded.", 500, "FAIR", "calculators", IMG("photo-1635070041078-e363dbe005cb")),
    ("diya",   "Orpat Scientific Calculator", "Basic scientific, no graphing. Perfect as a backup. Works fine.", 300, "FAIR", "calculators", IMG("photo-1611078703114-54a7d7d34a72")),

    # ------- ELECTRONICS -------
    ("ishita", "MacBook Air M1 8GB/256GB", "2021 model, space grey. 90% battery health. Charger + original box. No dents.", 52000, "GOOD", "electronics", IMG("photo-1517336714731-489689fd1ca8")),
    ("kabir",  "HP Pavilion 15 — Ryzen 5 5500U, 16GB", "Backlit keyboard, 512GB SSD, clean Windows 11. Light scuffs on lid. Perfect student laptop.", 38000, "GOOD", "electronics", IMG("photo-1580894732444-8ecded7900cd")),
    ("saanvi", "Redmi Note 12 Pro 5G — 128GB", "8 months old. Screen flawless, one micro-scratch on back. Box + charger included.", 14500, "GOOD", "electronics", IMG("photo-1511707171634-5f897ff02aa9")),
    ("diya",   "iPhone 12 Mini — 64GB", "Battery 84%. Comes with case, screen protector installed, original charger.", 28000, "GOOD", "electronics", IMG("photo-1592750475338-74b7b21085ab")),
    ("arjun",  "Bose QuietComfort 45 Headphones", "Bought last Diwali. Great ANC. Comes with case + cable. Excellent condition.", 18000, "LIKE_NEW", "electronics", IMG("photo-1546435770-a3e426bf472b")),
    ("vihaan", "boAt Rockerz 450 Bluetooth Headphones", "40-hour battery. Works perfectly. Selling because I moved to TWS earbuds.", 1200, "GOOD", "electronics", IMG("photo-1505740420928-5e560c06d30e")),
    ("ishita", "Sony WH-1000XM4", "Top-tier noise cancelling. 8 months old. Comes with case, cable, box.", 15000, "LIKE_NEW", "electronics", IMG("photo-1505740420928-5e560c06d30e")),
    ("vihaan", "Logitech MX Master 3S — Sealed", "Sealed. Won in a hackathon but I already have one. Box unopened.", 6500, "NEW", "electronics", IMG("photo-1527864550417-7fd91fc51a46")),
    ("ananya", "Noise ColorFit Pro 4 Smartwatch", "1 year old. Heart rate + SpO2 + 6-day battery. Charger included.", 2200, "GOOD", "electronics", IMG("photo-1546868871-7041f2a55e12")),
    ("rohan",  "Raspberry Pi 4 Model B — 4GB", "Bought last semester for a project. Comes with official PSU + 32GB SD card.", 5500, "GOOD", "electronics", IMG("photo-1580584126903-c17d41830450")),
    ("kabir",  "Anker 20000mAh Power Bank", "18W fast charge, dual output. Used twice. Comes with USB-C cable.", 1600, "LIKE_NEW", "electronics", IMG("photo-1609091839311-d5365f9ff1c5")),

    # ------- BOOKS -------
    ("priya",  "Data Structures & Algorithms Made Easy — Karumanchi", "GATE/placement standard. Spine has a slight crease, otherwise clean inside.", 380, "GOOD", "books", IMG("photo-1519681393784-d120267933ba")),
    ("ananya", "Higher Engineering Mathematics — B.S. Grewal 43rd Ed", "Few pages dog-eared, no markings. Ideal for first-year prep.", 420, "GOOD", "books", IMG("photo-1544716278-ca5e3f4abd8c")),
    ("priya",  "Introduction to Algorithms — CLRS 3rd Ed", "The bible. Light shelf wear. Spine intact, no torn pages.", 650, "GOOD", "books", IMG("photo-1544716278-ca5e3f4abd8c")),
    ("ishita", "Engineering Mathematics Vol 1 & 2 — B.S. Grewal (set)", "Both volumes together. Minor highlighting in a few sections.", 800, "GOOD", "books", IMG("photo-1519681393784-d120267933ba")),
    ("vihaan", "Operating System Concepts — Silberschatz", "10th edition. Standard OS textbook. Light marks in Ch 3–4.", 550, "GOOD", "books", IMG("photo-1544716278-ca5e3f4abd8c")),
    ("saanvi", "Computer Networks — Tanenbaum 5th Ed", "Clean copy, no writing. Spine has small wear.", 480, "GOOD", "books", IMG("photo-1519681393784-d120267933ba")),

    # ------- HOSTEL & FURNITURE -------
    ("diya",   "Hostel Study Table — Wooden 3x2 ft", "Sturdy wooden table with drawer. Move-out sale. Pickup from B-block hostel.", 1500, "FAIR", "hostel-furniture", IMG("photo-1593062096033-9a26b09da705")),
    ("diya",   "Study Lamp — LED Adjustable Arm", "Warm white LED. USB charging port on base. Works perfectly.", 400, "GOOD", "hostel-furniture", IMG("photo-1507473885765-e6ed057f782c")),
    ("saanvi", "Hostel Mattress — Single Bed 3in Foam", "Sleepwell 3-inch foam mattress. 1 year old. Clean, no stains.", 900, "FAIR", "hostel-furniture", IMG("photo-1505693416388-ac5ce068fe85")),
    ("saanvi", "Foldable Study Chair", "Metal frame, cushioned seat. Folds flat for storage. Minor wear on armrests.", 800, "FAIR", "hostel-furniture", IMG("photo-1586023492125-27b2c045efd7")),
    ("diya",   "Computer Table with Wheels", "Wooden top, metal frame, 4 castor wheels. Fits any laptop setup.", 2200, "GOOD", "hostel-furniture", IMG("photo-1593062096033-9a26b09da705")),
    ("saanvi", "Bookshelf — 4 Tier Metal", "Space-saving bookshelf. Assembly in 10 min. Minor wear on edges.", 1200, "FAIR", "hostel-furniture", IMG("photo-1594620302200-9a762244a156")),
    ("kabir",  "Plastic Storage Box — 40L", "Good for clothes or books. Lid intact, no cracks.", 350, "GOOD", "hostel-furniture", IMG("photo-1595079676339-1534801ad6cf")),

    # ------- CYCLES -------
    ("kabir",  "Hero Sprint 26T Cycle", "Well maintained, recently serviced. New tyres + brake pads. Ideal campus commute.", 4500, "GOOD", "cycles", IMG("photo-1485965120184-e220f721d03e")),
    ("kabir",  "Btwin Rockrider MTB — 21 Speed", "Mountain bike, 21 gears. Minor scratches from use. Serviced last month.", 8500, "GOOD", "cycles", IMG("photo-1571068316344-75bc76f77890")),
    ("kabir",  "Btwin Riverside 120 Hybrid Cycle", "Hybrid — good for city + light trails. Recently serviced, new chain.", 9500, "GOOD", "cycles", IMG("photo-1485965120184-e220f721d03e")),
    ("arjun",  "Firefox Mountain Bike 26T", "18-speed. Front suspension. Bought two years ago. Regular servicing done.", 6800, "GOOD", "cycles", IMG("photo-1571068316344-75bc76f77890")),
    ("rohan",  "Cycle Helmet + Bell Set", "Both barely used. Helmet is M size. Bell is weatherproof.", 550, "LIKE_NEW", "cycles", IMG("photo-1553978297-833d09932d31")),

    # ------- LAB / PROJECT KITS -------
    ("rohan",  "Arduino Uno R3 Starter Kit", "Complete kit — breadboard, jumpers, LEDs, resistors, ultrasonic sensor, servo. One mini project done.", 1200, "LIKE_NEW", "lab-kits", IMG("photo-1553406830-ef2513450d76")),
    ("rohan",  "ESP32 DevKit V1 + Sensor Bundle", "ESP32 board, DHT11, soil moisture, IR sensor. Used for one project.", 850, "GOOD", "lab-kits", IMG("photo-1608564697071-ddf911d81370")),
    ("rohan",  "Digital Multimeter — UNI-T UT33", "Auto-ranging. Comes with probes and manual. Works perfectly.", 900, "LIKE_NEW", "lab-kits", IMG("photo-1601972599720-36938d4ecd31")),
    ("arjun",  "Soldering Iron Kit — 60W Adjustable", "Adjustable temp. Comes with solder wire, flux, stand, 5 tips.", 650, "GOOD", "lab-kits", IMG("photo-1553406830-ef2513450d76")),
    ("rohan",  "Jumper Wires Bundle — Male/Female 120pcs", "Brand new. Never opened. Full set of 120 wires.", 200, "NEW", "lab-kits", IMG("photo-1553406830-ef2513450d76")),
    ("rohan",  "Logic Analyzer 8-Channel", "USB-based. Works with free Sigrok/PulseView software. Cable included.", 1400, "GOOD", "lab-kits", IMG("photo-1601972599720-36938d4ecd31")),

    # ------- SPORTS & FITNESS -------
    ("arjun",  "Resistance Band Set — 5 Levels", "All 5 bands + handles + carry bag. Barely used.", 700, "LIKE_NEW", "sports", IMG("photo-1598289431512-b97b0917affc")),
    ("arjun",  "Yonex Astrox 88D Badminton Racket", "Head-heavy. Re-gripped recently. Ideal for intermediate players.", 3200, "GOOD", "sports", IMG("photo-1617083934555-ac9f40f4a18e")),
    ("arjun",  "Adidas Football Size 5 — Original", "Used one season. Air tight. No tears.", 1400, "GOOD", "sports", IMG("photo-1551958219-acbc608c6377")),
    ("kabir",  "Skipping Rope — Weighted Handles", "CrossFit style. Adjustable length. Barely used.", 350, "LIKE_NEW", "sports", IMG("photo-1517836357463-d25dfeac3438")),
    ("saanvi", "Dumbbell Pair — 5kg each Adjustable", "Rubber coated. Comes with extra plates. Two dumbbells in set.", 1800, "GOOD", "sports", IMG("photo-1638536532686-d610adfc8e5c")),
    ("arjun",  "Yonex Badminton Racket + Cover", "Carbon fibre. Re-gripped. Ideal for beginners.", 950, "GOOD", "sports", IMG("photo-1617083934555-ac9f40f4a18e")),

    # ------- EVENT MERCH -------
    ("priya",  "GDG NMIT DevFest 2024 T-shirt — Size L", "Unworn. Still has tags. Too big for me.", 450, "NEW", "event-merch", IMG("photo-1503341504253-dff4815485f1")),
    ("ishita", "Hackathon Winner Hoodie — Size M", "Won at SIH regionals. Custom print. Worn twice.", 700, "LIKE_NEW", "event-merch", IMG("photo-1556821840-3a63f95609a7")),
    ("ananya", "NMIT CSE Batch 2025 T-shirt — Size S", "Batch merch. Never worn. Kept as backup.", 400, "NEW", "event-merch", IMG("photo-1503342217505-b0a15ec3261c")),
    ("diya",   "Festival Merch Tote Bag — Canvas", "Campus fest 2024 merch. Sturdy canvas. Unused.", 250, "NEW", "event-merch", IMG("photo-1591561954557-26941169b49e")),
    ("priya",  "GDG NMIT DevFest 2025 Hoodie — Size M", "Official merch. Worn once. No stains, no fading.", 600, "LIKE_NEW", "event-merch", IMG("photo-1556821840-3a63f95609a7")),

    # ------- ACADEMICS -------
    ("ananya", "Engineering Drawing Kit — Mini Drafter + Board", "Complete set — drafter, board, clips, set squares. First-year kit.", 550, "GOOD", "academics", IMG("photo-1589998059171-988d887df646")),
    ("priya",  "Lab Coat + Safety Goggles", "Both washed and clean. Size M. Ideal for chemistry labs.", 400, "GOOD", "academics", IMG("photo-1581093450021-4a7360e9a6b5")),
    ("vihaan", "Drawing Sheet Roll — A1, 10 sheets", "Unused roll of 10 A1 drawing sheets.", 250, "NEW", "academics", IMG("photo-1589998059171-988d887df646")),

    # ------- MISC -------
    ("saanvi", "Umbrella — Compact 3-fold", "Automatic open. Used twice. Blue colour.", 300, "LIKE_NEW", "misc", IMG("photo-1534361960057-19889db9621e")),
    ("kabir",  "Water Bottle — Insulated 1L", "Keeps water cold for 12 hours. Steel. Small dent on bottom.", 450, "GOOD", "misc", IMG("photo-1602143407151-7111542de6e8")),
]

async def run():
    async with AsyncSessionLocal() as db:
        # Fix broken images
        for title, url in FIX_IMAGE.items():
            res = await db.execute(select(Listing).where(Listing.title == title))
            for L in res.scalars().all():
                img_res = await db.execute(select(ListingImage).where(ListingImage.listing_id == L.id).order_by(ListingImage.sort_order))
                first = img_res.scalars().first()
                if first: first.storage_key = url
        await db.commit()
        print(f"✓ fixed {len(FIX_IMAGE)} broken images")

        # Load users
        users = {}
        for prefix in ["priya","rohan","ananya","ishita","kabir","saanvi","diya","arjun","vihaan","aarav"]:
            r = await db.execute(select(User).where(User.email.like(f"{prefix}.p@%")))
            u = r.scalar_one_or_none()
            if u: users[prefix] = u
        print(f"✓ found {len(users)} personas")

        cats_res = await db.execute(select(Category))
        cats = {c.slug: c.id for c in cats_res.scalars().all()}

        added = 0
        for key, title, desc, price, cond, slug, img in LISTINGS:
            u = users.get(key)
            if not u: continue
            ex = await db.execute(select(Listing).where(Listing.title == title))
            if ex.scalar_one_or_none(): continue
            L = Listing(seller_id=u.id, category_id=cats.get(slug), title=title, description=desc, price=price, condition=cond, status="ACTIVE", type="SELL")
            db.add(L); await db.flush()
            db.add(ListingImage(listing_id=L.id, storage_key=img, sort_order=0))
            added += 1
        await db.commit()
        print(f"✓ added {added} listings")

if __name__ == "__main__":
    asyncio.run(run())

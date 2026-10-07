import asyncio
import httpx

API = "http://localhost:8000"

USERS = [
    {"name": "Aarav Sharma", "email": "aarav@nmit.ac.in", "password": "demo12345", "department": "CSE"},
    {"name": "Priya Reddy", "email": "priya@nmit.ac.in", "password": "demo12345", "department": "ISE"},
    {"name": "Rohan Kumar", "email": "rohan@nmit.ac.in", "password": "demo12345", "department": "ECE"},
    {"name": "Ananya Iyer", "email": "ananya@nmit.ac.in", "password": "demo12345", "department": "AIML"},
]

LISTINGS = [
    {"title": "Casio FX-991CW Scientific Calculator", "description": "Bought last year, first year engineering. Minor wear on the cover, keys work perfectly. Bill available.", "price": 850, "condition": "GOOD", "cat_slug": "calculators"},
    {"title": "Engineering Mathematics by B.S. Grewal", "description": "44th edition. Some highlighting in chapters 1-3, otherwise clean. No torn pages.", "price": 450, "condition": "GOOD", "cat_slug": "books"},
    {"title": "Arduino Uno R3 Starter Kit", "description": "Complete kit with breadboard, jumper wires, LEDs, resistors, sensors. Used for one mini project.", "price": 1200, "condition": "LIKE_NEW", "cat_slug": "lab-kits"},
    {"title": "Hero Sprint Cycle 26T", "description": "Well maintained, recently serviced. New tyres. Great for campus commute.", "price": 4500, "condition": "GOOD", "cat_slug": "cycles"},
    {"title": "Dell Inspiron 15 — i5 11th Gen", "description": "8GB RAM, 512GB SSD, backlit keyboard. 2 years old, battery lasts ~4 hours. Windows 11.", "price": 32000, "condition": "GOOD", "cat_slug": "electronics"},
    {"title": "Hostel Study Table", "description": "Wooden table with drawer, 3x2 ft. Move-out sale — pick up from B-block hostel.", "price": 1500, "condition": "FAIR", "cat_slug": "hostel-furniture"},
    {"title": "Logitech MX Master 3S Mouse", "description": "Sealed, unused. Won in a hackathon but I already have one.", "price": 6500, "condition": "NEW", "cat_slug": "electronics"},
    {"title": "GDG NMIT Event Hoodie — Size M", "description": "Official 2025 devfest merch. Worn once. No stains, no fading.", "price": 600, "condition": "LIKE_NEW", "cat_slug": "event-merch"},
    {"title": "iPad 9th Gen 64GB WiFi", "description": "Space grey. Comes with Apple Pencil 1st gen and a folio case. Perfect for notes.", "price": 22000, "condition": "GOOD", "cat_slug": "electronics"},
    {"title": "Resistance Band Set (5 levels)", "description": "Barely used. All five bands + carry bag + handles.", "price": 700, "condition": "LIKE_NEW", "cat_slug": "sports"},
    {"title": "Data Structures and Algorithms Made Easy", "description": "Narasimha Karumanchi. GATE prep standard. Slight spine crease, no marks.", "price": 380, "condition": "GOOD", "cat_slug": "books"},
    {"title": "Hostel Mattress — Single Bed", "description": "Sleepwell, 3 inch foam. 1 year old. Clean, no stains. Move-out sale.", "price": 900, "condition": "FAIR", "cat_slug": "hostel-furniture"},
]

WANTED = [
    {"title": "Casio FX-991CW", "description": "Need for exams next week. Any condition as long as it works.", "max_price": 900, "min_condition": "FAIR"},
    {"title": "RTX 3050 GPU", "description": "Building a budget gaming rig. Under warranty preferred.", "max_price": 18000, "min_condition": "GOOD"},
    {"title": "Mini Drafter + Drawing Board", "description": "First year engineering drawing. Can pick up from campus.", "max_price": 350, "min_condition": "FAIR"},
]


async def main():
    async with httpx.AsyncClient(base_url=API, timeout=30) as c:
        tokens = {}
        for u in USERS:
            try:
                r = await c.post("/auth/register", json=u)
                data = r.json()
                if "access_token" in data:
                    tokens[u["email"]] = data["access_token"]
                    print(f"registered {u['email']}")
                else:
                    r = await c.post("/auth/login", json={"email": u["email"], "password": u["password"]})
                    tokens[u["email"]] = r.json()["access_token"]
                    print(f"logged in {u['email']}")
            except Exception as e:
                print(f"skip {u['email']}: {e}")

        # categories
        cats = {c["slug"]: c["id"] for c in (await c.get("/categories")).json()}

        emails = list(tokens.keys())
        for i, listing in enumerate(LISTINGS):
            email = emails[i % len(emails)]
            payload = {
                "title": listing["title"],
                "description": listing["description"],
                "price": listing["price"],
                "condition": listing["condition"],
                "type": "SELL",
                "category_id": cats.get(listing["cat_slug"]),
            }
            r = await c.post("/listings", json=payload, headers={"Authorization": f"Bearer {tokens[email]}"})
            print(f"listing: {listing['title'][:40]} -> {r.status_code}")

        for w in WANTED:
            email = emails[0]
            r = await c.post("/wanted", json=w, headers={"Authorization": f"Bearer {tokens[email]}"})
            print(f"wanted: {w['title']} -> {r.status_code}")

        print("\n--- DEMO ACCOUNTS ---")
        for u in USERS:
            print(f"  {u['email']} / demo12345")


if __name__ == "__main__":
    asyncio.run(main())

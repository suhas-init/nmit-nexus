import asyncio
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.category import Category

CATEGORIES = [
    ("Academics", "academics", "book-open", 1),
    ("Electronics", "electronics", "laptop", 2),
    ("Calculators", "calculators", "calculator", 3),
    ("Hostel & Furniture", "hostel-furniture", "bed", 4),
    ("Cycles & Transport", "cycles", "bike", 5),
    ("Lab & Project Kits", "lab-kits", "flask", 6),
    ("Sports & Fitness", "sports", "dumbbell", 7),
    ("Event Merch", "event-merch", "shirt", 8),
    ("Books & Stationery", "books", "book", 9),
    ("Misc", "misc", "package", 99),
]

async def main():
    async with AsyncSessionLocal() as db:
        for name, slug, icon, order in CATEGORIES:
            exists = await db.execute(select(Category).where(Category.slug == slug))
            if exists.scalar_one_or_none():
                continue
            db.add(Category(name=name, slug=slug, icon=icon, sort_order=order))
        await db.commit()
        print("seeded categories")

if __name__ == "__main__":
    asyncio.run(main())

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.routes import auth, listings, categories, external, offers, offers_mine, handovers, wanted, ai, price_pulse, ratings, notifications, images, receipt, favourites, users, meetups
from app.db.session import engine
from app.ws.routes import router as ws_router

app = FastAPI(title="NMIT Nexus API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://nmit-nexus.vercel.app",
        "https://nmit-nexus-j7ihnymbv-packet-pirates.vercel.app",
    ],
    allow_origin_regex=r"https://nmit-nexus.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(listings.router)
app.include_router(categories.router)
app.include_router(external.router)
app.include_router(offers.router)
app.include_router(offers_mine.router)
app.include_router(handovers.router)
app.include_router(wanted.router)
app.include_router(ai.router)
app.include_router(price_pulse.router)
app.include_router(ratings.router)
app.include_router(notifications.router)
app.include_router(images.router)
app.include_router(receipt.router)
app.include_router(favourites.router)
app.include_router(users.router)
app.include_router(meetups.router)
app.include_router(ws_router)


@app.get("/health")
async def health():
    db_ok = "down"
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
            db_ok = "ok"
    except Exception as e:
        db_ok = f"error: {e.__class__.__name__}"
    return {"api": "ok", "database": db_ok, "ws": "ok"}


@app.get("/")
async def root():
    return {"name": "NMIT Nexus API", "status": "alive"}

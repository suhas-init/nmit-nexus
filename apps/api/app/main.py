from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.routes import auth
from app.db.session import engine

app = FastAPI(title="NMIT Nexus API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)


@app.get("/health")
async def health():
    db_ok = "down"
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
            db_ok = "ok"
    except Exception as e:
        db_ok = f"error: {e.__class__.__name__}"
    return {"api": "ok", "database": db_ok}


@app.get("/")
async def root():
    return {"name": "NMIT Nexus API", "status": "alive"}

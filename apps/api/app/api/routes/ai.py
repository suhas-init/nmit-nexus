import json
import re
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from google import genai
from groq import Groq

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.listing import Listing
from app.models.user import User

router = APIRouter(prefix="/ai", tags=["ai"])

GEMINI_MODELS = ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash"]
_gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY) if settings.GEMINI_API_KEY else None
_groq_client = Groq(api_key=settings.GROQ_API_KEY) if settings.GROQ_API_KEY else None


class SearchIntentIn(BaseModel):
    query: str = Field(min_length=2, max_length=300)


class ListingDraftIn(BaseModel):
    description: str = Field(min_length=5, max_length=2000)
    category_hint: str | None = None


def _extract_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?", "", text).strip()
        text = re.sub(r"```$", "", text).strip()
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if not m:
        raise ValueError("no json found")
    return json.loads(m.group(0))


def _call_gemini(prompt: str) -> str:
    if _gemini_client is None:
        raise Exception("Gemini client not configured")
    r = _gemini_client.models.generate_content(model=MODEL, contents=prompt)
    return r.text or ""


def _call_groq(prompt: str) -> str:
    if _groq_client is None:
        raise Exception("Groq client not configured")
    kwargs = {
        "model": "openai/gpt-oss-120b",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2,
        "max_tokens": 1024,
    }
    if "JSON" in prompt:
        kwargs["response_format"] = {"type": "json_object"}
    completion = _groq_client.chat.completions.create(**kwargs)
    return completion.choices[0].message.content or ""


def _generate(prompt: str) -> str:
    try:
        return _call_gemini(prompt)
    except Exception as e:
        print(f"Gemini failed ({e}), falling back to Groq...")
        try:
            return _call_groq(prompt)
        except Exception as e2:
            raise HTTPException(502, f"Both AI providers failed. Gemini: {e}, Groq: {e2}")


@router.post("/search-intent")
async def search_intent(body: SearchIntentIn, db: AsyncSession = Depends(get_db)):
    prompt = f"""You are a search intent parser for a campus marketplace.

User query: "{body.query}"

Extract filters as strict JSON with these keys (omit unknown keys):
- keywords: array of strings (short, meaningful words for search)
- max_price: number (in INR, no currency symbol)
- min_price: number
- category: one of [academics, electronics, calculators, hostel-furniture, cycles, lab-kits, sports, event-merch, books, misc]
- condition: one of [NEW, LIKE_NEW, GOOD, FAIR, POOR]
- type: one of [SELL, RENT, BORROW, FREE]

Respond with ONLY valid JSON, no explanation, no markdown."""

    text = _generate(prompt)
    try:
        filters = _extract_json(text)
    except Exception as e:
        raise HTTPException(502, f"intent parse failed: {e}")

    stmt = select(Listing).where(Listing.status == "ACTIVE")
    if filters.get("max_price") is not None:
        try: stmt = stmt.where(Listing.price <= float(filters["max_price"]))
        except Exception: pass
    if filters.get("min_price") is not None:
        try: stmt = stmt.where(Listing.price >= float(filters["min_price"]))
        except Exception: pass
    if filters.get("condition"):
        stmt = stmt.where(Listing.condition == filters["condition"])
    if filters.get("type"):
        stmt = stmt.where(Listing.type == filters["type"])
    if filters.get("keywords"):
        like_clauses = []
        for kw in filters["keywords"][:5]:
            like = f"%{str(kw).lower()}%"
            like_clauses.append(func.lower(Listing.title).like(like))
            like_clauses.append(func.lower(Listing.description).like(like))
        if like_clauses:
            stmt = stmt.where(or_(*like_clauses))
    stmt = stmt.order_by(Listing.created_at.desc()).limit(20)

    res = await db.execute(stmt)
    listings = res.scalars().all()

    return {
        "filters": filters,
        "count": len(listings),
        "results": [
            {
                "id": str(l.id),
                "title": l.title,
                "price": float(l.price),
                "condition": l.condition,
                "type": l.type,
                "status": l.status,
                "created_at": l.created_at,
            }
            for l in listings
        ],
    }


@router.post("/listing-draft")
async def listing_draft(body: ListingDraftIn, user: User = Depends(get_current_user)):
    prompt = f"""You are a listing assistant for a campus marketplace in India.

Seller's rough description: "{body.description}"
Category hint: {body.category_hint or "none"}

Produce a clean, honest listing draft as strict JSON:
- title: short, specific (max 70 chars)
- description: 2-4 sentences, neutral tone, structured (include condition, what's included, reason if mentioned)
- suggested_price_min: number (INR)
- suggested_price_max: number (INR)
- condition: one of NEW, LIKE_NEW, GOOD, FAIR, POOR
- category_slug: one of [academics, electronics, calculators, hostel-furniture, cycles, lab-kits, sports, event-merch, books, misc]
- tags: array of 3-5 short keywords

Do NOT invent facts that aren't implied. If unsure, leave condition as "GOOD".
Respond with ONLY valid JSON."""

    text = _generate(prompt)
    try:
        return _extract_json(text)
    except Exception as e:
        raise HTTPException(502, f"draft failed: {e}")

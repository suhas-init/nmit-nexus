# NMIT Nexus

The trusted campus commerce OS for NMIT students.

Buy and sell within your verified campus community. Real handovers with cryptographic proof, AI search that understands plain English, and no strangers.

## What it solves

- Verified campus only — @nmit.ac.in emails get the verified badge
- QR-verified handovers — both parties enter each other's codes, receipt hash generated
- AI natural-language search — "find me a used calculator under 900" just works
- Wanted posts — post what you need, sellers bid
- Price pulse — median of comparable campus listings

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind |
| Backend | FastAPI, SQLAlchemy 2 async, Alembic |
| Database | PostgreSQL 16 local + Neon prod |
| Realtime | Redis + WebSockets |
| AI | Gemini 3.8 Flash + Groq Llama 3.3 fallback |
| External API | Open Library |
| Deployment | Vercel + Render + Neon |

## Local setup

docker compose up -d
cd apps/api && python3.13 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
python -m scripts.seed
uvicorn app.main:app --reload

Then in another terminal:
cd apps/web && npm install && npm run dev

## AI architecture

The LLM never touches the database. It calls a fixed set of tools. Backend validates args and enforces ownership.

## QR handover flow

1. Buyer offers, seller accepts
2. Both open handover page, each sees a 6-char code
3. Seller enters buyer's code, buyer enters seller's code
4. On mutual confirm: SHA-256 receipt generated, listing marked SOLD, ratings unlock

## Live

https://nmit-nexus.vercel.app

Student project. Not officially affiliated with Nitte Meenakshi Institute of Technology.

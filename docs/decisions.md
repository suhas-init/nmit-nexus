# Architecture Decision Records

## ADR-001: PostgreSQL over MongoDB
Relational and transactional data (listings, offers, handovers). Postgres + pgvector + pg_trgm handles relational, full-text, and vector search in one DB.

## ADR-002: Async SQLAlchemy + asyncpg
FastAPI is async-native; sync drivers block the event loop.

## ADR-003: WebSockets + Redis pub/sub
Offers, chat, handovers need realtime. Redis pub/sub allows multi-instance fan-out.

## ADR-004: LLM uses tools, never the database
The LLM may only call a fixed set of backend tools. Backend validates args and enforces ownership. App works even if LLM is down.

## ADR-005: Gemini + Groq fallback chain
Free-tier Gemini 503s under load. 8s timeout, then fall back to Groq Llama 3.3.

## ADR-006: QR-verified handover with SHA-256 receipt
"Mark as sold" is trivially faked. Both parties enter each other's rotating code. On mutual confirm, SHA-256 receipt, listing SOLD, trust incremented, ratings unlock.

## ADR-007: Modular monolith
Campus-scale. Microservices would add operational tax without benefit.

## ADR-008: Neon + Render + Vercel
Free tier, no credit card, always-on. Render cold-starts after inactivity (~30s).

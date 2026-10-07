"use client";
import { useState } from "react";
import { Search, Loader2, BookOpen } from "lucide-react";
import { api } from "@/lib/api";

export type BookHit = {
  source: string;
  id: string;
  title: string;
  authors: string[];
  publisher: string | null;
  publishedDate: string;
  thumbnail: string | null;
  isbn: string | null;
  pageCount: number | null;
  categories: string[];
  description: string;
};

export function BookSearch({ onPick }: { onPick: (b: BookHit) => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<BookHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const run = async () => {
    if (q.trim().length < 2) return;
    setLoading(true); setErr(null); setOpen(true);
    try {
      const res = await api.get<{ results: BookHit[] }>(`/external/books/search?q=${encodeURIComponent(q)}`);
      setHits(res.results);
    } catch {
      setErr("Couldn't reach the book database. Try again.");
      setHits([]);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ position: "relative" }}>
      <label className="term-label" style={{ display: "block", marginBottom: "0.5rem" }}>
        BOOK_LOOKUP · autofill from Open Library
      </label>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: 13, color: "var(--text-2)" }} />
          <input
            className="input"
            style={{ paddingLeft: 32 }}
            placeholder="Engineering Mathematics, Casio manual…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); run(); } }}
          />
        </div>
        <button type="button" className="btn btn-outline" onClick={run} disabled={loading}>
          {loading ? <Loader2 size={14} className="spin" /> : "Search"}
        </button>
      </div>

      {open && (
        <div className="card" style={{ marginTop: "0.75rem", maxHeight: 340, overflowY: "auto" }}>
          {loading && <div style={{ padding: "1rem", textAlign: "center", color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>searching…</div>}
          {err && <div style={{ padding: "1rem", color: "var(--red)", fontSize: "0.85rem" }}>{err}</div>}
          {!loading && !err && hits.length === 0 && (
            <div style={{ padding: "1rem", textAlign: "center", color: "var(--text-2)", fontSize: "0.85rem" }}>No books matched.</div>
          )}
          {!loading && hits.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => { onPick(b); setOpen(false); setQ(b.title); }}
              style={{
                display: "flex", gap: "0.75rem", width: "100%", textAlign: "left",
                padding: "0.75rem", border: "none", borderBottom: "1px solid var(--border-0)",
                background: "var(--bg-2)", cursor: "pointer", transition: "background 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-3)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg-2)")}
            >
              <div className="thumb" style={{ width: 44, height: 60, borderRadius: 6, flexShrink: 0, fontSize: "0.9rem" }}>
                {b.thumbnail ? <img src={b.thumbnail} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <BookOpen size={16} />}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 700, color: "var(--text-0)", fontSize: "0.9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.title}</div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-1)", marginBottom: "0.15rem" }}>{b.authors.join(", ") || "Unknown author"}{b.publishedDate ? ` · ${b.publishedDate}` : ""}</div>
                {b.publisher && <div style={{ fontSize: "0.72rem", color: "var(--text-2)" }}>{b.publisher}</div>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

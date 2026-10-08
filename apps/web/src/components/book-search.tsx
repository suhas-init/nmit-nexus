"use client";
import { useState } from "react";
import { Search, Loader2, BookOpen, X } from "lucide-react";
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
    <div className="book-lookup">
      <div className="book-lookup-head">
        <BookOpen size={14} style={{ color: "var(--sky, #0EA5E9)" }} />
        <span className="book-lookup-label">Book Lookup</span>
        <span className="book-lookup-hint">auto-fill a textbook listing</span>
      </div>

      <div className="book-lookup-row">
        <div className="book-lookup-input">
          <Search size={14} />
          <input
            placeholder="Engineering Mathematics, CLRS…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); run(); } }}
          />
        </div>
        <button type="button" className="book-lookup-btn" onClick={run} disabled={loading}>
          {loading ? <Loader2 size={14} className="spin" /> : "Search"}
        </button>
      </div>

      {open && (
        <div className="book-lookup-results">
          <div className="book-lookup-results-head">
            <span>{loading ? "searching…" : `${hits.length} result${hits.length === 1 ? "" : "s"}`}</span>
            <button type="button" onClick={() => { setOpen(false); setHits([]); }} aria-label="Close results">
              <X size={12} />
            </button>
          </div>

          {loading && (
            <div className="book-lookup-loading">
              <Loader2 size={16} className="spin" />
            </div>
          )}

          {!loading && err && <div className="book-lookup-err">{err}</div>}

          {!loading && !err && hits.length === 0 && (
            <div className="book-lookup-empty">No books matched that title.</div>
          )}

          {!loading && hits.map((b) => (
            <button
              key={b.id}
              type="button"
              className="book-lookup-item"
              onClick={() => { onPick(b); setOpen(false); setQ(b.title); }}
            >
              <div className="book-lookup-cover">
                {b.thumbnail ? (
                  <img src={b.thumbnail} alt="" />
                ) : (
                  <BookOpen size={14} style={{ color: "var(--text-2)" }} />
                )}
              </div>
              <div className="book-lookup-meta">
                <div className="book-lookup-title">{b.title}</div>
                <div className="book-lookup-author">
                  {b.authors.slice(0, 2).join(", ") || "Unknown author"}
                  {b.publishedDate ? ` · ${b.publishedDate}` : ""}
                </div>
                {b.publisher && <div className="book-lookup-pub">{b.publisher}</div>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";
import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { formatINR, timeAgo } from "@/lib/utils";
import { Sparkles, Loader2, Search } from "lucide-react";

type AiResult = {
  id: string;
  title: string;
  price: number;
  condition: string;
  type: string;
  status: string;
  created_at: string;
};

type AiResponse = {
  filters: Record<string, any>;
  count: number;
  results: AiResult[];
};

const EXAMPLES = [
  "find me a used calculator under 900",
  "cheap hostel table for my room",
  "second hand laptop for coding under 40k",
  "engineering mathematics textbook",
  "cycle in good condition",
];

export default function AiSearchPage() {
  const [q, setQ] = useState("");
  const [data, setData] = useState<AiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const run = async (query?: string) => {
    const text = (query ?? q).trim();
    if (text.length < 2) return;
    setLoading(true); setErr(null); setData(null);
    try {
      const res = await api.post<AiResponse>("/ai/search-intent", { query: text });
      setData(res);
      setQ(text);
    } catch (e: any) {
      setErr(e.detail || "AI search failed. Try the regular marketplace.");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", color: "var(--text-0)", fontWeight: 700, fontSize: "0.85rem" }}>
          <Sparkles size={16} /> AI-powered search
        </div>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-0)", marginBottom: "0.5rem" }}>Just describe what you need</h1>
        <p style={{ fontSize: "0.95rem", color: "#64748b" }}>Type it naturally. We'll extract the filters and find it.</p>
      </div>

      <div className="card" style={{ padding: "1rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={16} style={{ position: "absolute", left: 12, top: 13, color: "#94a3b8" }} />
            <input
              className="input"
              style={{ paddingLeft: 36, paddingTop: "0.75rem", paddingBottom: "0.75rem" }}
              placeholder="e.g. used casio calculator under ₹900"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && run()}
            />
          </div>
          <button className="btn btn-primary" onClick={() => run()} disabled={loading || q.length < 2}>
            {loading ? <Loader2 size={16} className="spin" /> : "Search"}
          </button>
        </div>

        {!data && !loading && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.85rem" }}>
            {EXAMPLES.map((ex) => (
              <button key={ex} onClick={() => run(ex)} className="btn btn-outline" style={{ padding: "0.35rem 0.7rem", fontSize: "0.78rem" }}>
                {ex}
              </button>
            ))}
          </div>
        )}
      </div>

      {err && <div className="card" style={{ padding: "1rem 1.25rem", color: "#b42318", marginBottom: "1rem" }}>{err}</div>}

      {loading && (
        <div style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>
          <Loader2 size={28} className="spin" style={{ margin: "0 auto 0.75rem" }} />
          Thinking…
        </div>
      )}

      {data && (
        <>
          <div className="card" style={{ padding: "1rem 1.25rem", marginBottom: "1.5rem", background: "#f7f8fb", borderColor: "#dde3ed" }}>
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: "0.5rem" }}>Extracted filters</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
              {Object.entries(data.filters).map(([k, v]) => (
                <span key={k} className="badge badge-condition">
                  {k}: {Array.isArray(v) ? v.join(", ") : String(v)}
                </span>
              ))}
              {Object.keys(data.filters).length === 0 && <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>No filters detected</span>}
            </div>
          </div>

          <div style={{ marginBottom: "1rem", fontWeight: 700, color: "var(--text-0)" }}>
            {data.count} {data.count === 1 ? "result" : "results"}
          </div>

          {data.count === 0 ? (
            <div className="card" style={{ padding: "2.5rem 1.5rem", textAlign: "center" }}>
              <div style={{ fontWeight: 700, color: "var(--text-0)", marginBottom: "0.35rem" }}>Nothing matched that search.</div>
              <div style={{ fontSize: "0.9rem" }}>Try widening the price range or post a Wanted request so sellers can find you.</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
              {data.results.map((l) => (
                <Link key={l.id} href={`/listing/${l.id}`} className="card" style={{ display: "block" }}>
                  <div style={{ height: 120, background: "linear-gradient(135deg, #eef1f7 0%, #dce3ef 100%)", display: "grid", placeItems: "center", color: "#94a3b8", fontWeight: 700 }}>
                    {l.title.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ padding: "0.9rem" }}>
                    <div style={{ display: "flex", gap: "0.35rem", marginBottom: "0.4rem", flexWrap: "wrap" }}>
                      <span className="badge badge-condition">{l.condition.replace("_", " ")}</span>
                      {l.status === "SOLD" && <span className="badge badge-sold">Sold</span>}
                    </div>
                    <div style={{ fontWeight: 700, color: "var(--text-0)", fontSize: "0.95rem", marginBottom: "0.35rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.title}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 800, color: "var(--text-0)" }}>{formatINR(l.price)}</span>
                      <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{timeAgo(l.created_at)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

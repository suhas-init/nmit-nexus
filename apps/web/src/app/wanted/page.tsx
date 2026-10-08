"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useAuth } from "@/store/auth";
import { wantedApi, WantedPost } from "@/lib/wanted";
import { api, Category } from "@/lib/api";
import { formatINR, timeAgo } from "@/lib/utils";
import { Search, PlusCircle, Megaphone } from "lucide-react";

export default function WantedListPage() {
  const { user, accessToken } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [maxPrice, setMaxPrice] = useState(500);
  const [categoryId, setCategoryId] = useState("");
  const [minCondition, setMinCondition] = useState("GOOD");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => api.get<Category[]>("/categories"),
  });

  const { data, isLoading } = useQuery<WantedPost[]>({
    queryKey: ["wanted", q],
    queryFn: () => wantedApi.list(q || undefined),
    refetchInterval: 5000,
  });

  const submit = async () => {
    if (!accessToken) return;
    setBusy(true); setErr(null);
    try {
      await wantedApi.create({ title, description, max_price: maxPrice, category_id: categoryId || null, min_condition: minCondition } as any, accessToken);
      setShowForm(false); setTitle(""); setDescription(""); setMaxPrice(500); setCategoryId(""); setMinCondition("GOOD");
      qc.invalidateQueries({ queryKey: ["wanted"] });
    } catch (e: any) { setErr(e.detail || "Failed"); } finally { setBusy(false); }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-0)" }}>Wanted</h1>
          <p style={{ fontSize: "0.9rem" }}>What students are looking for right now.</p>
        </div>
        {user && (
          <button
            className={`btn ${showForm ? "btn-outline" : "btn-primary"} wanted-cta`}
            onClick={() => setShowForm((v) => !v)}
            style={{
              padding: "0.85rem 1.4rem",
              fontSize: "0.88rem",
              fontWeight: 700,
              letterSpacing: "0.03em",
              position: "relative",
              overflow: "hidden",
              boxShadow: showForm ? "none" : "0 8px 28px -8px rgba(242, 183, 5, 0.5)",
            }}
          >
            <PlusCircle size={17} />
            {showForm ? "Cancel" : "Post what you need"}
          </button>
        )}
      </div>

      {showForm && (
        <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
          <div style={{ display: "grid", gap: "1rem" }}>
            <div>
              <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-0)", display: "block", marginBottom: "0.35rem" }}>What do you need?</label>
              <input className="input" placeholder="Casio FX-991CW" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-0)", display: "block", marginBottom: "0.35rem" }}>Details</label>
              <textarea className="textarea" rows={3} placeholder="Needed for exams next week, budget tight..." value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-0)", display: "block", marginBottom: "0.35rem" }}>Max price (₹)</label>
                <input className="input" type="number" min={1} value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} />
              </div>
              <div>
                <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-0)", display: "block", marginBottom: "0.35rem" }}>Min condition</label>
                <select className="select" value={minCondition} onChange={(e) => setMinCondition(e.target.value)}>
                  <option value="NEW">New</option><option value="LIKE_NEW">Like new</option>
                  <option value="GOOD">Good</option><option value="FAIR">Fair</option><option value="POOR">Poor</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-0)", display: "block", marginBottom: "0.35rem" }}>Category</label>
                <select className="select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  <option value="">Any</option>
                  {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            {err && <div style={{ color: "#b42318", fontSize: "0.85rem" }}>{err}</div>}
            <button className="btn btn-primary" onClick={submit} disabled={busy || title.length < 3 || description.length < 5}>
              {busy ? "Posting..." : "Post wanted"}
            </button>
          </div>
        </div>
      )}

      <div style={{ marginBottom: "1.5rem", position: "relative" }}>
        <Search size={15} style={{ position: "absolute", left: 10, top: 12, color: "#94a3b8" }} />
        <input className="input" style={{ paddingLeft: 32 }} placeholder="Search wanted posts..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {isLoading && <div className="card" style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>Loading…</div>}

      {!isLoading && (!data || data.length === 0) && (
        <div className="card" style={{ padding: "3rem 1.5rem", textAlign: "center" }}>
          <Megaphone size={40} style={{ color: "#94a3b8", margin: "0 auto 0.75rem" }} />
          <div style={{ fontWeight: 700, color: "var(--text-0)", marginBottom: "0.35rem" }}>No wanted posts yet.</div>
          <div style={{ fontSize: "0.9rem" }}>Be the first — tell sellers what you need.</div>
        </div>
      )}

      {!isLoading && data?.map((w) => (
        <Link key={w.id} href={`/wanted/${w.id}`} className="card" style={{ padding: "1.15rem 1.35rem", display: "block", marginBottom: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                <span className="badge badge-verified">Wanted</span>
                <span className="badge badge-condition">{w.min_condition.replace("_", " ")}</span>
              </div>
              <div style={{ fontWeight: 700, color: "var(--text-0)", fontSize: "1.05rem", marginBottom: "0.25rem" }}>{w.title}</div>
              <div style={{ fontSize: "0.88rem", color: "#64748b", marginBottom: "0.35rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.description}</div>
              <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>{timeAgo(w.created_at)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" }}>Max</div>
              <div style={{ fontWeight: 800, color: "var(--text-0)", fontSize: "1.3rem" }}>{formatINR(w.max_price)}</div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

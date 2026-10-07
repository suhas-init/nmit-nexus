"use client";
import { useQuery } from "@tanstack/react-query";
import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, Category, Listing } from "@/lib/api";
import { formatINR, timeAgo } from "@/lib/utils";
import { Search, PackageOpen } from "lucide-react";

function MarketplaceInner() {
  const params = useSearchParams();
  const initialQ = params.get("q") || "";
  const [q, setQ] = useState(initialQ);
  const [cat, setCat] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => api.get<Category[]>("/categories"),
  });

  const qs = new URLSearchParams();
  if (q) qs.set("q", q);
  if (cat) qs.set("category_id", cat);
  if (maxPrice) qs.set("max_price", maxPrice);

  const { data: listings, isLoading, error } = useQuery<Listing[]>({
    queryKey: ["listings", q, cat, maxPrice],
    queryFn: () => api.get<Listing[]>(`/listings?${qs.toString()}`),
  });

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--navy)" }}>Marketplace</h1>
        <p style={{ fontSize: "0.9rem" }}>Browse listings from verified NMIT students.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: "1.5rem", alignItems: "start" }}>
        <aside className="card" style={{ padding: "1.25rem", position: "sticky", top: 90 }}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--navy)", display: "block", marginBottom: "0.4rem" }}>Search</label>
            <div style={{ position: "relative" }}>
              <Search size={15} style={{ position: "absolute", left: 10, top: 12, color: "#94a3b8" }} />
              <input className="input" style={{ paddingLeft: 32 }} placeholder="Calculator, laptop..." value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--navy)", display: "block", marginBottom: "0.4rem" }}>Category</label>
            <select className="select" value={cat} onChange={(e) => setCat(e.target.value)}>
              <option value="">All categories</option>
              {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--navy)", display: "block", marginBottom: "0.4rem" }}>Max price (₹)</label>
            <input className="input" type="number" min={0} placeholder="Any" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
          </div>

          {(q || cat || maxPrice) && (
            <button className="btn btn-outline" style={{ width: "100%", marginTop: "1rem" }} onClick={() => { setQ(""); setCat(""); setMaxPrice(""); }}>
              Clear filters
            </button>
          )}
        </aside>

        <section>
          {isLoading && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
              {[1,2,3,4,5,6].map((i) => <div key={i} className="card" style={{ height: 240, background: "#eef1f7" }} />)}
            </div>
          )}

          {error && <div className="card" style={{ padding: "1.5rem", color: "#b42318" }}>Couldn’t load listings. Try refreshing.</div>}

          {!isLoading && !error && listings && listings.length === 0 && (
            <div className="card" style={{ padding: "3rem 1.5rem", textAlign: "center" }}>
              <PackageOpen size={40} style={{ color: "#94a3b8", margin: "0 auto 0.75rem" }} />
              <div style={{ fontWeight: 700, color: "var(--navy)", marginBottom: "0.35rem" }}>Nothing matched that search.</div>
              <div style={{ fontSize: "0.9rem" }}>Try widening the price range or post a Wanted request so sellers can find you.</div>
            </div>
          )}

          {!isLoading && !error && listings && listings.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
              {listings.map((l) => (
                <Link key={l.id} href={`/listing/${l.id}`} className="card" style={{ display: "block", transition: "transform 0.15s" }}>
                  <div style={{ height: 140, background: "linear-gradient(135deg, #eef1f7 0%, #dce3ef 100%)", display: "grid", placeItems: "center", color: "#94a3b8", fontWeight: 700, fontSize: "0.85rem" }}>
                    {l.title.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ padding: "0.9rem" }}>
                    <div style={{ display: "flex", gap: "0.35rem", marginBottom: "0.4rem", flexWrap: "wrap" }}>
                      <span className="badge badge-condition">{l.condition.replace("_", " ")}</span>
                      {l.status === "SOLD" && <span className="badge badge-sold">Sold</span>}
                    </div>
                    <div style={{ fontWeight: 700, color: "var(--navy)", fontSize: "0.95rem", marginBottom: "0.35rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.title}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 800, color: "var(--navy)" }}>{formatINR(l.price)}</span>
                      <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{timeAgo(l.created_at)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function MarketplacePage() {
  return <Suspense fallback={<div style={{ padding: "3rem", textAlign: "center" }}>Loading...</div>}><MarketplaceInner /></Suspense>;
}

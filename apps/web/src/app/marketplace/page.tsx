"use client";
import { useQuery } from "@tanstack/react-query";
import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, Category, Listing } from "@/lib/api";
import { formatINR, timeAgo } from "@/lib/utils";
import { Search, PackageOpen } from "lucide-react";
import { ListingCardCover } from "@/components/listing-card-cover";

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
      <div style={{ marginBottom: "1.75rem" }}>
        <div className="term-label" style={{ marginBottom: "0.5rem" }}>MARKETPLACE</div>
        <h1 style={{ fontSize: "1.9rem", fontWeight: 800, color: "var(--text-0)", fontFamily: "var(--font-mono)", letterSpacing: "-0.02em", marginBottom: "0.25rem" }}>Browse listings</h1>
        <p style={{ fontSize: "0.9rem", color: "var(--text-2)", fontFamily: "var(--font-mono)" }}>
          <span className="pulse-dot" style={{ marginRight: 8 }} /> LIVE · <span style={{ color: "var(--accent)" }}>{listings?.length || 0}</span> items on campus
        </p>
      </div>

      <div className="market-layout" style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: "1.5rem", alignItems: "start" }}>
        <aside className="card market-sidebar" style={{ padding: "1.15rem", position: "sticky", top: 90 }}>
          <div style={{ marginBottom: "1rem" }}>
            <div className="term-label" style={{ marginBottom: "0.5rem" }}>SEARCH</div>
            <div style={{ position: "relative" }}>
              <Search size={13} style={{ position: "absolute", left: 10, top: 13, color: "var(--text-2)" }} />
              <input className="input" style={{ paddingLeft: 30, fontSize: "0.82rem" }} placeholder="calculator, laptop…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <div className="term-label" style={{ marginBottom: "0.5rem" }}>CATEGORY</div>
            <select className="select" value={cat} onChange={(e) => setCat(e.target.value)} style={{ fontSize: "0.82rem" }}>
              <option value="">ALL</option>
              {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <div className="term-label" style={{ marginBottom: "0.5rem" }}>MAX PRICE (₹)</div>
            <input className="input" type="number" min={0} placeholder="ANY" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} style={{ fontSize: "0.82rem" }} />
          </div>

          {(q || cat || maxPrice) && (
            <button className="btn btn-outline" style={{ width: "100%", marginTop: "1rem", fontSize: "0.7rem" }} onClick={() => { setQ(""); setCat(""); setMaxPrice(""); }}>
              Clear filters
            </button>
          )}
        </aside>

        <section>
          {isLoading && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
              {[1,2,3,4,5,6].map((i) => <div key={i} className="skeleton" style={{ height: 260 }} />)}
            </div>
          )}

          {error && <div className="card" style={{ padding: "1.5rem", color: "var(--red)", fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}>ERR_LOAD_FAILED — try refreshing</div>}

          {!isLoading && !error && listings && listings.length === 0 && (
            <div className="card" style={{ padding: "3rem 1.5rem", textAlign: "center" }}>
              <PackageOpen size={36} style={{ color: "var(--text-2)", margin: "0 auto 0.75rem" }} />
              <div style={{ fontWeight: 700, color: "var(--text-0)", marginBottom: "0.35rem", fontFamily: "var(--font-mono)" }}>Nothing matched that search.</div>
              <div style={{ fontSize: "0.88rem", color: "var(--text-1)", marginBottom: "1.25rem" }}>Try widening the price range or post a Wanted request so sellers can find you.</div>
              <Link href="/wanted" className="btn btn-primary">Post Wanted</Link>
            </div>
          )}

          {!isLoading && !error && listings && listings.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: "1rem" }}>
              {listings.map((l, i) => (
                <Link key={l.id} href={`/listing/${l.id}`} className="card lift fade-in-up" style={{ display: "block", animationDelay: `${Math.min(i * 0.03, 0.3)}s` }}>
                  <ListingCardCover listingId={l.id} title={l.title} />
                  <div style={{ padding: "0.9rem" }}>
                    <div style={{ display: "flex", gap: "0.3rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                      <span className="badge badge-condition">{l.condition.replace("_", " ")}</span>
                      {l.status === "SOLD" && <span className="badge badge-sold">SOLD</span>}
                      {l.status === "RESERVED" && <span className="badge badge-verified">RESERVED</span>}
                    </div>
                    <div style={{ fontWeight: 700, color: "var(--text-0)", fontSize: "0.95rem", marginBottom: "0.5rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.title}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span style={{ fontWeight: 800, color: "var(--accent)", fontFamily: "var(--font-mono)", fontSize: "1.05rem" }}>{formatINR(l.price)}</span>
                      <span className="mono" style={{ fontSize: "0.7rem", color: "var(--text-2)" }}>{timeAgo(l.created_at)}</span>
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
  return <Suspense fallback={<div style={{ padding: "3rem", textAlign: "center", color: "var(--text-2)" }}>Loading…</div>}><MarketplaceInner /></Suspense>;
}

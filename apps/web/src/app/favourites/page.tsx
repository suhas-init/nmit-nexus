"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useAuth } from "@/store/auth";
import { api, Listing } from "@/lib/api";
import { formatINR, timeAgo } from "@/lib/utils";
import { Heart } from "lucide-react";

export default function FavouritesPage() {
  const { user, accessToken } = useAuth();

  const { data, isLoading } = useQuery<Listing[]>({
    queryKey: ["favourites", user?.id],
    queryFn: () => api.get<Listing[]>("/favourites", accessToken!),
    enabled: !!user && !!accessToken,
  });

  if (!user) return <div className="card" style={{ padding: "3rem", textAlign: "center" }}>Sign in to view favourites.</div>;

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <div className="term-label" style={{ marginBottom: "0.5rem" }}>WISHLIST</div>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--text-0)", fontFamily: "var(--font-mono)", letterSpacing: "-0.02em" }}>Saved items</h1>
        <p style={{ fontSize: "0.9rem", color: "var(--text-2)" }}>Items you're keeping an eye on.</p>
      </div>

      {isLoading && <div className="card" style={{ padding: "2rem", textAlign: "center", color: "var(--text-2)" }}>Loading…</div>}

      {!isLoading && (!data || data.length === 0) && (
        <div className="card" style={{ padding: "3rem 1.5rem", textAlign: "center" }}>
          <Heart size={40} style={{ color: "var(--text-2)", margin: "0 auto 0.75rem" }} />
          <div style={{ fontWeight: 700, color: "var(--text-0)", marginBottom: "0.35rem" }}>No favourites yet.</div>
          <div style={{ fontSize: "0.9rem", color: "var(--text-1)", marginBottom: "1.25rem" }}>Tap the heart on any listing to save it here.</div>
          <Link href="/marketplace" className="btn btn-primary">Browse marketplace</Link>
        </div>
      )}

      {!isLoading && data && data.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: "1rem" }}>
          {data.map((l) => (
            <Link key={l.id} href={`/listing/${l.id}`} className="card hover-card" style={{ display: "block" }}>
              <div className="thumb" style={{ height: 140, fontSize: "1.6rem" }}>
                {l.title.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ padding: "0.9rem" }}>
                <div className="hover-card-title" style={{ fontWeight: 700, color: "var(--text-0)", fontSize: "0.95rem", marginBottom: "0.5rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.title}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontWeight: 800, color: "var(--accent)", fontFamily: "var(--font-mono)" }}>{formatINR(l.price)}</span>
                  <span className="mono" style={{ fontSize: "0.7rem", color: "var(--text-2)" }}>{timeAgo(l.created_at)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

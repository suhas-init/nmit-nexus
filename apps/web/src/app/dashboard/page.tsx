"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useAuth } from "@/store/auth";
import { api, Listing } from "@/lib/api";
import { formatINR, timeAgo } from "@/lib/utils";
import { Package, Eye, CheckCircle2, PackageOpen, Star, TrendingUp } from "lucide-react";

export default function DashboardPage() {
  const { user, accessToken } = useAuth();
  const qc = useQueryClient();

  const { data: listings, isLoading } = useQuery<Listing[]>({
    queryKey: ["my-listings", user?.id],
    queryFn: () => api.get<Listing[]>(`/listings?limit=100`),
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="card" style={{ padding: "3rem 1.5rem", textAlign: "center", maxWidth: 480, margin: "3rem auto" }}>
        <div style={{ fontWeight: 800, color: "var(--text-0)", fontSize: "1.3rem", marginBottom: "0.5rem" }}>Sign in required</div>
        <p style={{ fontSize: "0.9rem", marginBottom: "1.25rem" }}>Please sign in to view your dashboard.</p>
        <Link href="/login?next=/dashboard" className="btn btn-primary">Sign in</Link>
      </div>
    );
  }

  const mine = listings?.filter((l) => l.seller_id === user.id) || [];
  const active = mine.filter((l) => l.status === "ACTIVE");
  const sold = mine.filter((l) => l.status === "SOLD");

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-0)" }}>Hi, {user.name.split(" ")[0]} 👋</h1>
        <p style={{ fontSize: "0.9rem" }}>Manage your listings and track your activity.</p>
      </div>

      <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        {[
          { icon: Package, label: "Active listings", value: active.length },
          { icon: CheckCircle2, label: "Sold", value: sold.length },
          { icon: Star, label: "Avg rating", value: user.avg_rating.toFixed(1) },
          { icon: TrendingUp, label: "Completed", value: user.completed_transactions },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card" style={{ padding: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#94a3b8", fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "0.5rem" }}>
                <Icon size={14} /> {s.label}
              </div>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-0)" }}>{s.value}</div>
            </div>
          );
        })}
      </div>

      {user.campus_verified && (
        <div className="card" style={{ padding: "1rem 1.25rem", marginBottom: "1.5rem", background: "#fff6d9", borderColor: "#f0dc8c", display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <CheckCircle2 size={18} style={{ color: "#8a6500" }} />
          <div style={{ fontSize: "0.9rem", color: "#8a6500", fontWeight: 600 }}>Campus verified — @nmit.ac.in confirmed</div>
        </div>
      )}

      <div style={{ marginBottom: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-0)" }}>My listings</h2>
        <Link href="/sell" className="btn btn-primary" style={{ padding: "0.45rem 0.9rem", fontSize: "0.85rem" }}>+ New listing</Link>
      </div>

      {isLoading && <div className="card" style={{ height: 160, background: "var(--bg-2)" }} />}

      {!isLoading && mine.length === 0 && (
        <div className="card" style={{ padding: "3rem 1.5rem", textAlign: "center" }}>
          <PackageOpen size={40} style={{ color: "#94a3b8", margin: "0 auto 0.75rem" }} />
          <div style={{ fontWeight: 700, color: "var(--text-0)", marginBottom: "0.35rem" }}>You haven’t posted anything yet.</div>
          <div style={{ fontSize: "0.9rem", marginBottom: "1.25rem" }}>Post your first listing to get started.</div>
          <Link href="/sell" className="btn btn-gold">Post an item</Link>
        </div>
      )}

      {!isLoading && mine.length > 0 && (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {mine.map((l) => (
            <Link key={l.id} href={`/listing/${l.id}`} className="card" style={{ padding: "1rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", minWidth: 0, flex: 1 }}>
                <div className="thumb" style={{ width: 48, height: 48, borderRadius: 10, fontSize: "0.75rem", flexShrink: 0 }}>
                  {l.title.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 700, color: "var(--text-0)", fontSize: "0.95rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.title}</div>
                  <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>{timeAgo(l.created_at)}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <span style={{ fontWeight: 800, color: "var(--text-0)" }}>{formatINR(l.price)}</span>
                {l.status === "SOLD" ? <span className="badge badge-sold">Sold</span> : <span className="badge badge-active">Active</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

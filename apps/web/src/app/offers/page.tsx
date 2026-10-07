"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useAuth } from "@/store/auth";
import { offersApi, Offer } from "@/lib/offers";
import { formatINR, timeAgo } from "@/lib/utils";
import { Inbox } from "lucide-react";

export default function OffersPage() {
  const { user, accessToken } = useAuth();
  const qc = useQueryClient();

  const { data: listings } = useQuery({
    queryKey: ["my-listing-ids", user?.id],
    queryFn: async () => {
      const all = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/listings?limit=100`).then(r => r.json());
      return all.filter((l: any) => l.seller_id === user?.id).map((l: any) => ({ id: l.id, title: l.title }));
    },
    enabled: !!user,
  });

  const { data: offers, isLoading } = useQuery({
    queryKey: ["offers-inbox", listings],
    queryFn: async () => {
      if (!listings || !accessToken) return [];
      const results: Array<Offer & { listing_title: string }> = [];
      for (const l of listings) {
        const os = await offersApi.listForListing(l.id, accessToken);
        for (const o of os) results.push({ ...o, listing_title: l.title });
      }
      return results.sort((a, b) => b.created_at.localeCompare(a.created_at));
    },
    enabled: !!user && !!accessToken && !!listings,
  });

  const respond = async (id: string, action: "accept" | "reject") => {
    if (!accessToken) return;
    await offersApi.respond(id, action, accessToken);
    qc.invalidateQueries({ queryKey: ["offers-inbox"] });
  };

  if (!user) return <div className="card" style={{ padding: "3rem", textAlign: "center" }}>Sign in to view offers.</div>;

  return (
    <div>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--navy)", marginBottom: "0.35rem" }}>Offers inbox</h1>
      <p style={{ fontSize: "0.9rem", marginBottom: "1.5rem" }}>Offers buyers have made on your listings.</p>

      {isLoading && <div className="card" style={{ padding: "1.5rem", textAlign: "center", color: "#94a3b8" }}>Loading…</div>}

      {!isLoading && (!offers || offers.length === 0) && (
        <div className="card" style={{ padding: "3rem 1.5rem", textAlign: "center" }}>
          <Inbox size={40} style={{ color: "#94a3b8", margin: "0 auto 0.75rem" }} />
          <div style={{ fontWeight: 700, color: "var(--navy)", marginBottom: "0.35rem" }}>No offers yet.</div>
          <div style={{ fontSize: "0.9rem" }}>When buyers make offers on your listings, they'll appear here.</div>
        </div>
      )}

      {!isLoading && offers && offers.map((o) => (
        <div key={o.id} className="card" style={{ padding: "1rem 1.25rem", marginBottom: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ minWidth: 0 }}>
              <Link href={`/listing/${o.listing_id}`} style={{ fontWeight: 700, color: "var(--navy)", fontSize: "0.95rem" }}>{o.listing_title}</Link>
              <div style={{ fontSize: "0.82rem", color: "#94a3b8", marginTop: "0.15rem" }}>{timeAgo(o.created_at)}</div>
              {o.message && <div style={{ fontSize: "0.88rem", marginTop: "0.5rem" }}>“{o.message}”</div>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ fontWeight: 800, color: "var(--navy)", fontSize: "1.1rem" }}>{formatINR(o.offer_price)}</span>
              {o.status === "PENDING" ? (
                <>
                  <button className="btn btn-primary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.82rem" }} onClick={() => respond(o.id, "accept")}>Accept</button>
                  <button className="btn btn-outline" style={{ padding: "0.4rem 0.8rem", fontSize: "0.82rem" }} onClick={() => respond(o.id, "reject")}>Reject</button>
                </>
              ) : (
                <span className={`badge ${o.status === "ACCEPTED" ? "badge-active" : "badge-sold"}`}>{o.status}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

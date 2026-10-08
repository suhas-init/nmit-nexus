"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useAuth } from "@/store/auth";
import { offersApi, Offer } from "@/lib/offers";
import { api } from "@/lib/api";
import { formatINR, timeAgo } from "@/lib/utils";
import { Inbox, Send } from "lucide-react";

type MyOffer = {
  id: string;
  listing_id: string;
  listing_title: string;
  offer_price: number;
  message: string | null;
  status: string;
  created_at: string;
};

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

  const { data: myOffers } = useQuery<MyOffer[]>({
    queryKey: ["my-offers", user?.id],
    queryFn: () => api.get<MyOffer[]>("/my-offers", accessToken!),
    enabled: !!user && !!accessToken,
    refetchInterval: 5000,
  });

  const respond = async (id: string, action: "accept" | "reject") => {
    if (!accessToken) return;
    // Optimistic — update status locally first
    qc.setQueryData(["offers-inbox", listings], (old: any) => {
      if (!Array.isArray(old)) return old;
      return old.map((o: any) =>
        o.id === id ? { ...o, status: action === "accept" ? "ACCEPTED" : "REJECTED" } : o
      );
    });
    try {
      await offersApi.respond(id, action, accessToken);
    } finally {
      qc.invalidateQueries({ queryKey: ["offers-inbox"] });
      qc.invalidateQueries({ queryKey: ["my-offers"] });
    }
  };

  if (!user) return <div className="card" style={{ padding: "3rem", textAlign: "center" }}>Sign in to view offers.</div>;

  return (
    <div>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-0)", marginBottom: "0.35rem" }}>Offers</h1>
      <p style={{ fontSize: "0.9rem", marginBottom: "2rem" }}>Manage offers on your listings and offers you've made.</p>

      <section style={{ marginBottom: "2.5rem" }}>
        <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--text-0)", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <Inbox size={18} /> Received (on your listings)
        </h2>

        {isLoading && <div className="card" style={{ padding: "1.5rem", textAlign: "center", color: "#94a3b8" }}>Loading…</div>}

        {!isLoading && (!offers || offers.length === 0) && (
          <div className="card" style={{ padding: "2.5rem 1.5rem", textAlign: "center" }}>
            <div style={{ fontWeight: 700, color: "var(--text-0)", marginBottom: "0.35rem" }}>No incoming offers yet.</div>
            <div style={{ fontSize: "0.9rem" }}>When buyers make offers, they'll appear here.</div>
          </div>
        )}

        {!isLoading && offers && offers.map((o) => (
          <div key={o.id} className="card" style={{ padding: "1rem 1.25rem", marginBottom: "0.75rem" }}>
            <div className="row-stack" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
              <div style={{ minWidth: 0 }}>
                <Link href={`/listing/${o.listing_id}`} style={{ fontWeight: 700, color: "var(--text-0)", fontSize: "0.95rem" }}>{o.listing_title}</Link>
                <div style={{ fontSize: "0.82rem", color: "#94a3b8", marginTop: "0.15rem" }}>{timeAgo(o.created_at)}</div>
                {o.message && <div style={{ fontSize: "0.88rem", marginTop: "0.5rem" }}>"{o.message}"</div>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span style={{ fontWeight: 800, color: "var(--text-0)", fontSize: "1.1rem" }}>{formatINR(o.offer_price)}</span>
                {o.status === "PENDING" ? (
                  <>
                    <button className="btn btn-primary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.82rem" }} onClick={() => respond(o.id, "accept")}>Accept</button>
                    <button className="btn btn-outline" style={{ padding: "0.4rem 0.8rem", fontSize: "0.82rem" }} onClick={() => respond(o.id, "reject")}>Reject</button>
                  </>
                ) : o.status === "ACCEPTED" ? (
                  <Link href={`/handover/${o.id}`} className="btn btn-gold" style={{ padding: "0.4rem 0.8rem", fontSize: "0.82rem" }}>Complete handover</Link>
                ) : (
                  <span className="badge badge-sold">{o.status}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </section>

      <section>
        <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--text-0)", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <Send size={18} /> Sent (offers you made)
        </h2>

        {(!myOffers || myOffers.length === 0) && (
          <div className="card" style={{ padding: "2.5rem 1.5rem", textAlign: "center" }}>
            <div style={{ fontWeight: 700, color: "var(--text-0)", marginBottom: "0.35rem" }}>You haven't made any offers.</div>
            <div style={{ fontSize: "0.9rem" }}>Browse the marketplace and make an offer on something you want.</div>
          </div>
        )}

        {myOffers?.map((o) => (
          <div key={o.id} className="card" style={{ padding: "1rem 1.25rem", marginBottom: "0.75rem" }}>
            <div className="row-stack" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
              <div style={{ minWidth: 0 }}>
                <Link href={`/listing/${o.listing_id}`} style={{ fontWeight: 700, color: "var(--text-0)", fontSize: "0.95rem" }}>{o.listing_title}</Link>
                <div style={{ fontSize: "0.82rem", color: "#94a3b8", marginTop: "0.15rem" }}>You offered {formatINR(o.offer_price)} · {timeAgo(o.created_at)}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                {o.status === "ACCEPTED" ? (
                  <Link href={`/handover/${o.id}`} className="btn btn-gold" style={{ padding: "0.4rem 0.8rem", fontSize: "0.82rem" }}>Complete handover</Link>
                ) : o.status === "PENDING" ? (
                  <span className="badge badge-condition">Waiting on seller</span>
                ) : (
                  <span className="badge badge-sold">{o.status}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

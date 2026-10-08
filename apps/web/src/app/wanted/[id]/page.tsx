"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/store/auth";
import { wantedApi, WantedPost, WantedBid } from "@/lib/wanted";
import { formatINR, timeAgo } from "@/lib/utils";
import { ArrowLeft, Megaphone, Trophy, XCircle } from "lucide-react";

export default function WantedDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, accessToken } = useAuth();
  const qc = useQueryClient();
  const [bidPrice, setBidPrice] = useState(0);
  const [bidMsg, setBidMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { data: w, isLoading } = useQuery<WantedPost>({
    queryKey: ["wanted", id],
    queryFn: () => wantedApi.get(id),
  });

  const isOwner = user?.id === w?.buyer_id;

  const { data: bids } = useQuery<WantedBid[]>({
    queryKey: ["wanted-bids", id],
    queryFn: () => wantedApi.bids(id, accessToken!),
    enabled: !!accessToken && !!isOwner,
    refetchInterval: 4000,
  });

  const submitBid = async () => {
    if (!accessToken || bidPrice <= 0) return;
    setBusy(true); setErr(null);
    try {
      await wantedApi.bid(id, { bid_price: bidPrice, message: bidMsg || undefined }, accessToken);
      setBidPrice(0); setBidMsg("");
      qc.invalidateQueries({ queryKey: ["wanted-bids", id] });
    } catch (e: any) { setErr(e.detail || "Bid failed"); } finally { setBusy(false); }
  };

  const respond = async (bidId: string, action: "accept" | "reject") => {
    if (!accessToken) return;
    // Optimistic
    qc.setQueryData(["wanted-bids", id], (old: any) => {
      if (!Array.isArray(old)) return old;
      return old.map((b: any) =>
        b.id === bidId ? { ...b, status: action === "accept" ? "ACCEPTED" : "REJECTED" } : b
      );
    });
    qc.setQueryData(["wanted", id], (old: any) =>
      action === "accept" && old ? { ...old, status: "FULFILLED" } : old
    );
    try {
      await wantedApi.respond(bidId, action, accessToken);
    } finally {
      qc.invalidateQueries({ queryKey: ["wanted-bids", id] });
      qc.invalidateQueries({ queryKey: ["wanted", id] });
      qc.invalidateQueries({ queryKey: ["wanted"] });
    }
  };

  if (isLoading) return <div style={{ padding: "3rem", textAlign: "center" }}>Loading…</div>;
  if (!w) return <div className="card" style={{ padding: "2rem", textAlign: "center" }}>Not found.</div>;

  return (
    <div>
      <Link href="/wanted" style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.9rem", marginBottom: "1rem", color: "var(--text-0)", fontWeight: 600 }}>
        <ArrowLeft size={15} /> Back to Wanted
      </Link>

      <div className="card" style={{ padding: "1.75rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <span className="badge badge-verified">Wanted</span>
          <span className="badge badge-condition">{w.min_condition.replace("_", " ")}</span>
          {w.status === "FULFILLED" && <span className="badge badge-active">Fulfilled</span>}
        </div>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-0)", marginBottom: "0.5rem" }}>{w.title}</h1>
        <div style={{ fontSize: "0.85rem", color: "#94a3b8", marginBottom: "1rem" }}>Posted {timeAgo(w.created_at)}</div>
        <p style={{ fontSize: "0.95rem", lineHeight: 1.6, whiteSpace: "pre-wrap", marginBottom: "1rem" }}>{w.description}</p>
        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", padding: "0.85rem", background: "#f7f8fb", borderRadius: 10 }}>
          <div>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Max price</div>
            <div style={{ fontWeight: 800, color: "var(--text-0)", fontSize: "1.2rem" }}>{formatINR(w.max_price)}</div>
          </div>
          <div>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Min condition</div>
            <div style={{ fontWeight: 700, color: "var(--text-0)" }}>{w.min_condition.replace("_", " ")}</div>
          </div>
        </div>
      </div>

      {!user && <div className="card" style={{ padding: "1.5rem", textAlign: "center" }}>Sign in to bid or manage.</div>}

      {user && !isOwner && w.status === "OPEN" && (
        <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
          <div style={{ fontWeight: 700, color: "var(--text-0)", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Megaphone size={16} /> Have one? Bid on this request.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: "0.75rem", alignItems: "end" }}>
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-0)", display: "block", marginBottom: "0.35rem" }}>Your price (₹)</label>
              <input className="input" type="number" min={1} value={bidPrice || ""} onChange={(e) => setBidPrice(Number(e.target.value))} placeholder="850" />
            </div>
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-0)", display: "block", marginBottom: "0.35rem" }}>Message</label>
              <input className="input" value={bidMsg} onChange={(e) => setBidMsg(e.target.value)} placeholder="I have one, good condition" />
            </div>
            <button className="btn btn-gold" onClick={submitBid} disabled={busy || bidPrice <= 0}>{busy ? "…" : "Send bid"}</button>
          </div>
          {err && <div style={{ color: "#b42318", fontSize: "0.85rem", marginTop: "0.5rem" }}>{err}</div>}
        </div>
      )}

      {isOwner && (
        <div>
          <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--text-0)", marginBottom: "1rem" }}>Bids ({bids?.length || 0})</h2>
          {!bids || bids.length === 0 ? (
            <div className="card" style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>No bids yet. Sellers will start bidding shortly.</div>
          ) : (
            bids.map((b, i) => (
              <div key={b.id} className="card" style={{ padding: "1rem 1.25rem", marginBottom: "0.75rem", borderColor: i === 0 ? "var(--accent)" : undefined, borderWidth: i === 0 ? 2 : 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0 }}>
                    {i === 0 && <span className="badge badge-verified" style={{ marginBottom: "0.35rem" }}><Trophy size={11} /> Best bid</span>}
                    <div style={{ fontWeight: 800, color: "var(--text-0)", fontSize: "1.2rem" }}>{formatINR(b.bid_price)}</div>
                    {b.message && <div style={{ fontSize: "0.88rem", marginTop: "0.35rem" }}>"{b.message}"</div>}
                    <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: "0.35rem" }}>{timeAgo(b.created_at)}</div>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    {b.status === "PENDING" ? (
                      <>
                        <button className="btn btn-primary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.82rem" }} onClick={() => respond(b.id, "accept")}>Accept</button>
                        <button className="btn btn-outline" style={{ padding: "0.4rem 0.8rem", fontSize: "0.82rem" }} onClick={() => respond(b.id, "reject")}><XCircle size={14} /></button>
                      </>
                    ) : (
                      <span className={`badge ${b.status === "ACCEPTED" ? "badge-active" : "badge-sold"}`}>{b.status}</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

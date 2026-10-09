"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/store/auth";
import { handoversApi, Handover } from "@/lib/handovers";
import { CheckCircle2, ShieldCheck, KeyRound, ArrowLeft, Download, Star } from "lucide-react";
import Link from "next/link";
import { ConfettiBurst } from "@/components/confetti-burst";

export default function HandoverPage() {
  const { offerId } = useParams<{ offerId: string }>();
  const { user, accessToken } = useAuth();
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data, isLoading, error } = useQuery<Handover>({
    queryKey: ["handover", offerId],
    queryFn: async () => {
      try { return await handoversApi.get(offerId, accessToken!); }
      catch { return await handoversApi.init(offerId, accessToken!); }
    },
    enabled: !!accessToken,
    refetchInterval: 4000,
  });

  const isSeller = user?.id === data?.seller_id;
  const myToken = isSeller ? data?.seller_token : data?.buyer_token;
  const myRole: "seller" | "buyer" = isSeller ? "seller" : "buyer";
  const myConfirmed = isSeller ? data?.seller_confirmed : data?.buyer_confirmed;
  const otherConfirmed = isSeller ? data?.buyer_confirmed : data?.seller_confirmed;

  const confirm = async () => {
    if (!code.trim() || !accessToken) return;
    setBusy(true); setErr(null);
    try {
      await handoversApi.confirm(offerId, myRole, code.trim(), accessToken);
      setCode("");
      qc.invalidateQueries({ queryKey: ["handover", offerId] });
    } catch (e: any) {
      setErr(e.detail || "Invalid code");
    } finally { setBusy(false); }
  };

  if (!user) {
    return (
      <div className="card" style={{ padding: "2rem", maxWidth: 460, margin: "3rem auto", textAlign: "center" }}>
        <div style={{ fontWeight: 700, color: "var(--text-0)", marginBottom: "0.5rem" }}>Sign in first</div>
        <Link href="/login" className="btn btn-primary">Login</Link>
      </div>
    );
  }

  if (isLoading) return <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-2)" }}>Loading handover…</div>;
  if (error || !data) return <div className="card" style={{ padding: "2rem", textAlign: "center", maxWidth: 480, margin: "3rem auto" }}>Handover not available.</div>;

  return (
    <div style={{ maxWidth: 640, margin: "2rem auto" }}>
      {data.verified && <ConfettiBurst trigger={data.verified} />}

      <Link href="/offers" style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.9rem", marginBottom: "1rem", color: "var(--text-2)", fontWeight: 500 }}>
        <ArrowLeft size={15} /> Back
      </Link>

      <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", color: "var(--green)", fontWeight: 700, fontSize: "0.82rem", fontFamily: "var(--font-mono)", letterSpacing: "0.14em", textTransform: "uppercase" }}>
          <ShieldCheck size={15} /> QR-verified handover
        </div>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--text-0)", marginBottom: "0.35rem", fontFamily: "var(--font-mono)", letterSpacing: "-0.02em" }}>
          {data.listing_title}
        </h1>
        <p style={{ fontSize: "0.9rem", color: "var(--text-1)", marginBottom: "1.75rem" }}>
          {data.verified ? "Handover complete." : "Meet in person. Show your code, enter theirs."}
        </p>

        {data.verified ? (
          <div>
            <CheckCircle2 size={56} style={{ color: "var(--green)", margin: "0 auto 1rem" }} />
            <div style={{ fontWeight: 700, color: "var(--text-0)", fontSize: "1.2rem", marginBottom: "0.4rem", fontFamily: "var(--font-mono)" }}>
              Deal complete ✓
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-1)", marginBottom: "1.5rem" }}>
              Digital receipt issued to both parties.
            </div>

            <div className="card" style={{ padding: "1rem", background: "var(--bg-2)", border: "1px solid var(--border-0)", textAlign: "left", marginBottom: "1rem" }}>
              <div className="term-label" style={{ marginBottom: "0.5rem" }}>RECEIPT_HASH · SHA-256</div>
              <div className="mono" style={{ fontSize: "0.72rem", color: "var(--text-1)", wordBreak: "break-all", lineHeight: 1.7 }}>
                {data.receipt_hash}
              </div>
            </div>

            <button
              onClick={async () => {
                const base = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");
                const res = await fetch(`${base}/receipt/${offerId}.pdf`, {
                  headers: { Authorization: `Bearer ${accessToken}` },
                });
                if (!res.ok) { alert("Couldn't download receipt"); return; }
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `nmit-nexus-receipt-${offerId.slice(0, 8)}.pdf`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="btn btn-primary"
              style={{ width: "100%", marginBottom: "1.25rem" }}
            >
              <Download size={14} /> Download PDF receipt
            </button>

            <RateDeal offerId={offerId} accessToken={accessToken!} />
          </div>
        ) : (
          <>
            {/* QR — kept on white because scanners need contrast */}
            <div style={{ display: "inline-block", padding: "1.25rem", background: "#FFFFFF", borderRadius: 12, marginBottom: "1.25rem", border: "1px solid var(--border-0)" }}>
              <QRCodeSVG value={myToken || ""} size={180} level="M" bgColor="#FFFFFF" fgColor="#08090B" />
            </div>

            <div className="mono" style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--accent)", letterSpacing: "0.35em", marginBottom: "0.85rem", textAlign: "center", paddingLeft: "0.35em" }}>
              {myToken}
            </div>

            <div style={{ fontSize: "0.88rem", marginBottom: "1.5rem", color: "var(--text-1)" }}>
              <strong style={{ color: "var(--text-0)" }}>Your code — show this to the other party.</strong>
              <div style={{ fontSize: "0.8rem", color: "var(--text-2)", marginTop: "0.25rem" }}>
                They enter it on their screen to confirm.
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem", padding: "1rem", background: "var(--bg-2)", border: "1px solid var(--border-0)", borderRadius: 10, marginBottom: "1.5rem", textAlign: "left" }}>
              <div style={{ flex: 1 }}>
                <div className="term-label" style={{ marginBottom: "0.4rem" }}>STATUS</div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-1)" }}>
                  You: <strong style={{ color: myConfirmed ? "var(--green)" : "var(--text-0)" }}>{myConfirmed ? "confirmed ✓" : "waiting"}</strong>
                  <br />
                  Other: <strong style={{ color: otherConfirmed ? "var(--green)" : "var(--text-0)" }}>{otherConfirmed ? "confirmed ✓" : "waiting"}</strong>
                </div>
              </div>
            </div>

            <div style={{ textAlign: "left" }}>
              <label className="term-label" style={{ display: "block", marginBottom: "0.5rem" }}>
                <KeyRound size={12} style={{ display: "inline", marginRight: 6 }} />
                ENTER THE OTHER PARTY'S CODE
              </label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  className="input"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                  maxLength={6}
                  style={{
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.4em",
                    textTransform: "uppercase",
                    fontSize: "1.35rem",
                    textAlign: "center",
                    fontWeight: 700,
                    color: "var(--accent)",
                    background: "var(--bg-2)",
                    borderColor: "var(--border-1)",
                    paddingLeft: "0.4em",
                  }}
                />
                <button className="btn btn-primary" onClick={confirm} disabled={busy || code.length < 6}>
                  {busy ? "…" : "Confirm"}
                </button>
              </div>
              {err && <div className="mono" style={{ color: "var(--red)", fontSize: "0.78rem", marginTop: "0.5rem" }}>{err}</div>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function RateDeal({ offerId, accessToken }: { offerId: string; accessToken: string }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/handovers/${offerId}/my-rating`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((d) => { if (d.rated) setDone(true); })
      .catch(() => {});
  }, [offerId, accessToken]);

  const submit = async () => {
    if (rating < 1) return;
    setBusy(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/handovers/${offerId}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ rating, comment: comment || null }),
      });
      setDone(true);
    } finally { setBusy(false); }
  };

  if (done) {
    return (
      <div style={{ padding: "0.85rem", background: "rgba(74, 222, 128, 0.08)", border: "1px solid rgba(74, 222, 128, 0.25)", borderRadius: 8, color: "var(--green)", fontSize: "0.85rem", fontWeight: 600 }}>
        ✓ You've rated this deal
      </div>
    );
  }

  return (
    <div style={{ textAlign: "left", borderTop: "1px solid var(--border-0)", paddingTop: "1.5rem" }}>
      <div className="term-label" style={{ marginBottom: "0.75rem" }}>RATE THIS DEAL</div>
      <div style={{ display: "flex", gap: "0.35rem", marginBottom: "0.85rem", justifyContent: "center" }}>
        {[1,2,3,4,5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
            style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>
            <Star size={26} fill={(hover || rating) >= n ? "var(--accent)" : "none"} color={(hover || rating) >= n ? "var(--accent)" : "var(--border-2)"} />
          </button>
        ))}
      </div>
      <textarea className="textarea" rows={2} placeholder="Optional: how was the interaction?" value={comment} onChange={(e) => setComment(e.target.value)} style={{ marginBottom: "0.6rem" }} />
      <button className="btn btn-primary" onClick={submit} disabled={busy || rating < 1} style={{ width: "100%" }}>
        {busy ? "Submitting…" : "Submit rating"}
      </button>
    </div>
  );
}

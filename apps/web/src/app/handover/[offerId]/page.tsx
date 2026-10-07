"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/store/auth";
import { handoversApi, Handover } from "@/lib/handovers";
import { CheckCircle2, ShieldCheck, KeyRound, ArrowLeft } from "lucide-react";
import Link from "next/link";

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
  const isBuyer = user?.id === data?.buyer_id;
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

  if (!user) return <div className="card" style={{ padding: "3rem", textAlign: "center", maxWidth: 480, margin: "3rem auto" }}>Sign in to view handover.</div>;
  if (isLoading) return <div style={{ padding: "3rem", textAlign: "center" }}>Loading handover…</div>;
  if (error || !data) return <div className="card" style={{ padding: "2rem", textAlign: "center", maxWidth: 480, margin: "3rem auto" }}>Handover not available.</div>;

  return (
    <div style={{ maxWidth: 640, margin: "2rem auto" }}>
      <Link href="/offers" style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.9rem", marginBottom: "1rem", color: "var(--navy)", fontWeight: 600 }}>
        <ArrowLeft size={15} /> Back
      </Link>

      <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", color: "#1e7a3f", fontWeight: 700, fontSize: "0.85rem" }}>
          <ShieldCheck size={16} /> QR-verified handover
        </div>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--navy)", marginBottom: "0.35rem" }}>{data.listing_title}</h1>
        <p style={{ fontSize: "0.9rem", color: "#94a3b8", marginBottom: "1.5rem" }}>
          {data.verified ? "Handover complete." : "Meet in person. Show your code, enter theirs."}
        </p>

        {data.verified ? (
          <div>
            <CheckCircle2 size={56} style={{ color: "#1e7a3f", margin: "0 auto 1rem" }} />
            <div style={{ fontWeight: 800, color: "var(--navy)", fontSize: "1.2rem", marginBottom: "0.5rem" }}>Deal complete ✓</div>
            <div style={{ fontSize: "0.85rem", color: "#94a3b8", marginBottom: "1rem" }}>Digital receipt issued to both parties.</div>
            <div className="card" style={{ padding: "0.85rem", background: "#f7f8fb", textAlign: "left", fontSize: "0.78rem", fontFamily: "monospace", wordBreak: "break-all" }}>
              <div style={{ fontWeight: 700, color: "var(--navy)", marginBottom: "0.35rem", fontFamily: "inherit" }}>Receipt hash</div>
              {data.receipt_hash}
            </div>
          </div>
        ) : (
          <>
            <div style={{ padding: "1.5rem", background: "#f7f8fb", borderRadius: 12, display: "inline-block", marginBottom: "1.5rem" }}>
              <QRCodeSVG value={myToken || ""} size={180} level="M" />
              <div style={{ marginTop: "0.85rem", fontWeight: 700, color: "var(--navy)", fontFamily: "monospace", fontSize: "1.4rem", letterSpacing: "0.1em" }}>
                {myToken}
              </div>
            </div>

            <div style={{ fontSize: "0.9rem", marginBottom: "1.5rem" }}>
              <strong>Your code — show this to the other party.</strong>
              <div style={{ fontSize: "0.82rem", color: "#94a3b8", marginTop: "0.25rem" }}>
                They enter it on their screen to confirm.
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.5rem", padding: "1rem", background: "#eef1f7", borderRadius: 12 }}>
              <div style={{ textAlign: "left", flex: 1 }}>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--navy)" }}>Status</div>
                <div style={{ fontSize: "0.85rem", marginTop: "0.3rem" }}>
                  You: <strong>{myConfirmed ? "confirmed ✓" : "waiting"}</strong>
                  <br />
                  Other: <strong>{otherConfirmed ? "confirmed ✓" : "waiting"}</strong>
                </div>
              </div>
            </div>

            <div style={{ marginTop: "1.5rem", textAlign: "left" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--navy)", display: "block", marginBottom: "0.35rem" }}>
                <KeyRound size={13} style={{ display: "inline", marginRight: 4 }} />
                Enter the other party's code
              </label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input className="input" placeholder="6-char code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={6} style={{ fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase" }} />
                <button className="btn btn-primary" onClick={confirm} disabled={busy || code.length < 6}>
                  {busy ? "…" : "Confirm"}
                </button>
              </div>
              {err && <div style={{ color: "#b42318", fontSize: "0.82rem", marginTop: "0.35rem" }}>{err}</div>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

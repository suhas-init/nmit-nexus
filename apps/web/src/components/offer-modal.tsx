"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/store/auth";
import { formatINR } from "@/lib/utils";
import { X } from "lucide-react";

export function OfferModal({ listingId, price, onClose }: { listingId: string; price: number; onClose: () => void }) {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [amount, setAmount] = useState(Math.round(price * 0.9));
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!accessToken) return;
    setBusy(true); setErr(null);
    try {
      await api.post(`/listings/${listingId}/offers`, { offer_price: amount, message: msg || null }, accessToken);
      onClose();
      router.push("/offers");
    } catch (e) {
      const err = e as ApiError;
      setErr(err.detail || "Could not send offer");
    } finally { setBusy(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(11,30,63,0.5)", display: "grid", placeItems: "center", zIndex: 100, padding: "1rem" }} onClick={onClose}>
      <div className="card" style={{ padding: "1.5rem", width: "100%", maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div style={{ fontWeight: 800, color: "var(--navy)", fontSize: "1.15rem" }}>Make an offer</div>
          <button onClick={onClose} className="btn btn-outline" style={{ padding: "0.3rem 0.5rem" }}><X size={14} /></button>
        </div>

        <div style={{ fontSize: "0.85rem", color: "#94a3b8", marginBottom: "1rem" }}>Listed at {formatINR(price)}</div>

        {err && <div style={{ padding: "0.6rem 0.85rem", background: "#fdeaea", color: "#b42318", borderRadius: 8, fontSize: "0.85rem", marginBottom: "1rem" }}>{err}</div>}

        <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--navy)", display: "block", marginBottom: "0.35rem" }}>Your offer (₹)</label>
        <input className="input" type="number" min={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />

        <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--navy)", display: "block", margin: "0.85rem 0 0.35rem" }}>Message (optional)</label>
        <textarea className="textarea" rows={3} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Meet at library entrance?" />

        <button className="btn btn-primary" style={{ width: "100%", marginTop: "1rem" }} onClick={submit} disabled={busy || amount <= 0}>
          {busy ? "Sending..." : `Send offer ${formatINR(amount)}`}
        </button>
      </div>
    </div>
  );
}

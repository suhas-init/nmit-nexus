"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { TrendingUp, TrendingDown, Minus, Loader2 } from "lucide-react";
import { formatINR } from "@/lib/utils";

type Pulse = {
  verdict: "cheap" | "fair" | "expensive" | "unknown";
  label?: string;
  message?: string;
  target_price?: number;
  median?: number;
  range_low?: number;
  range_high?: number;
  sample_size: number;
};

export function PricePulse({ listingId }: { listingId: string }) {
  const { data, isLoading } = useQuery<Pulse>({
    queryKey: ["price-pulse", listingId],
    queryFn: () => api.get<Pulse>(`/price-pulse/${listingId}`),
  });

  if (isLoading) {
    return (
      <div className="card" style={{ padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "#94a3b8", fontSize: "0.85rem" }}>
        <Loader2 size={14} className="spin" /> Checking campus price…
      </div>
    );
  }
  if (!data) return null;

  if (data.verdict === "unknown") {
    return (
      <div className="card" style={{ padding: "1rem 1.25rem", background: "#f7f8fb" }}>
        <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: "0.35rem" }}>Price Pulse</div>
        <div style={{ fontSize: "0.85rem", color: "#64748b" }}>{data.message}</div>
      </div>
    );
  }

  const Icon = data.verdict === "cheap" ? TrendingDown : data.verdict === "expensive" ? TrendingUp : Minus;
  const color = data.verdict === "cheap" ? "#1e7a3f" : data.verdict === "expensive" ? "#b42318" : "#8a6500";
  const bg = data.verdict === "cheap" ? "#e7f5ec" : data.verdict === "expensive" ? "#fdeaea" : "#fff6d9";

  const lo = data.range_low!;
  const hi = data.range_high!;
  const span = Math.max(hi - lo, 1);
  const pos = Math.min(100, Math.max(0, ((data.target_price! - lo) / span) * 100));

  return (
    <div className="card" style={{ padding: "1rem 1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
        <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Price Pulse</div>
        <span className="badge" style={{ background: bg, color, fontWeight: 700, textTransform: "capitalize" }}>
          <Icon size={12} /> {data.verdict}
        </span>
      </div>
      <div style={{ fontSize: "0.88rem", marginBottom: "0.75rem", color: "#334155" }}>{data.label}</div>
      <div style={{ position: "relative", height: 6, background: "#eef1f7", borderRadius: 3, marginBottom: "0.5rem" }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pos}%`, background: color, borderRadius: 3, opacity: 0.3 }} />
        <div style={{ position: "absolute", left: `${pos}%`, top: -3, transform: "translateX(-50%)", width: 12, height: 12, borderRadius: "50%", background: color, border: "2px solid white", boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#94a3b8" }}>
        <span>{formatINR(lo)}</span>
        <span style={{ fontWeight: 700, color: "var(--navy)" }}>you: {formatINR(data.target_price!)}</span>
        <span>{formatINR(hi)}</span>
      </div>
      <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "0.5rem" }}>Based on {data.sample_size} similar campus listings</div>
    </div>
  );
}

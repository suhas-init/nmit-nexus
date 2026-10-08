"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";

type Stats = {
  active_listings: number;
  sold_listings: number;
  verified_users: number;
  verified_handovers: number;
  open_wanted: number;
};

function CountUp({ value }: { value: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const dur = 900;
    const tick = (t: number) => {
      const p = Math.min((t - start) / dur, 1);
      setN(Math.floor(p * value));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{n}</>;
}

export function LiveStats() {
  const { data } = useQuery<Stats>({
    queryKey: ["campus-stats"],
    queryFn: () => api.get<Stats>("/stats/campus"),
    refetchInterval: 15000,
  });

  const items = [
    { label: "active listings", value: data?.active_listings ?? 0, color: "var(--accent)" },
    { label: "verified users", value: data?.verified_users ?? 0, color: "var(--text-0)" },
    { label: "handovers verified", value: data?.verified_handovers ?? 0, color: "var(--green)" },
    { label: "items sold", value: data?.sold_listings ?? 0, color: "var(--blue)" },
  ];

  return (
    <section className="reveal" style={{ maxWidth: 1200, margin: "5rem auto 0", borderTop: "1px solid var(--border-0)", paddingTop: "3rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "2rem" }}>
        <div className="term-label">LIVE_CAMPUS_STATS</div>
        <div className="mono" style={{ fontSize: "0.68rem", color: "var(--green)", letterSpacing: "0.14em", display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span className="pulse-dot" /> LIVE
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
        {items.map((it) => (
          <div key={it.label} className="card" style={{ padding: "1.5rem" }}>
            <div className="mono" style={{ fontSize: "clamp(2rem, 4vw, 2.75rem)", fontWeight: 500, color: it.color, lineHeight: 1, letterSpacing: "-0.03em", marginBottom: "0.5rem" }}>
              <CountUp value={it.value} />
            </div>
            <div className="mono" style={{ fontSize: "0.68rem", color: "var(--text-2)", letterSpacing: "0.14em", textTransform: "uppercase" }}>
              {it.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

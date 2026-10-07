"use client";
import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, Listing } from "@/lib/api";
import { formatINR } from "@/lib/utils";

export function HoverPreview({ listing }: { listing: Listing }) {
  const [show, setShow] = useState(false);
  const timer = useRef<any>(null);

  const enter = () => {
    timer.current = setTimeout(() => setShow(true), 400);
  };
  const leave = () => {
    clearTimeout(timer.current);
    setShow(false);
  };

  return (
    <div onMouseEnter={enter} onMouseLeave={leave} style={{ position: "relative", display: "inline-block", width: "100%" }}>
      <span style={{ position: "absolute", inset: 0, zIndex: 10 }} />
      {show && (
        <div className="card" style={{
          position: "absolute", top: "100%", left: 0, marginTop: 8, zIndex: 50,
          width: 280, padding: "0.85rem", background: "var(--bg-2)",
          boxShadow: "0 20px 40px -20px rgba(0,0,0,0.7)", pointerEvents: "none",
          animation: "fadeUp 0.18s ease-out",
        }}>
          <div className="mono" style={{ fontSize: "0.6rem", color: "var(--text-2)", letterSpacing: "0.14em", marginBottom: "0.5rem" }}>QUICK_VIEW</div>
          <div style={{ fontWeight: 600, color: "var(--text-0)", fontSize: "0.9rem", marginBottom: "0.35rem" }}>{listing.title}</div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-1)", lineHeight: 1.5, marginBottom: "0.6rem", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {listing.description}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="mono" style={{ color: "var(--accent)", fontWeight: 600 }}>{formatINR(listing.price)}</span>
            <span className="badge badge-condition">{listing.condition.replace("_", " ")}</span>
          </div>
        </div>
      )}
    </div>
  );
}

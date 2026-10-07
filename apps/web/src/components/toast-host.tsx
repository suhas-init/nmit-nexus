"use client";
import Link from "next/link";
import { useToasts } from "@/store/toasts";
import { X } from "lucide-react";

export function ToastHost() {
  const { toasts, dismiss } = useToasts();
  return (
    <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 200, display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: 340 }}>
      {toasts.map((t) => (
        <div key={t.id} className="card" style={{ padding: "0.85rem 1rem", boxShadow: "0 10px 30px rgba(11,30,63,0.15)", borderLeft: `4px solid ${t.kind === "success" ? "#1e7a3f" : "var(--text-0)"}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, color: "var(--text-0)", fontSize: "0.9rem" }}>{t.title}</div>
              {t.body && <div style={{ fontSize: "0.82rem", color: "#64748b", marginTop: "0.2rem" }}>{t.body}</div>}
              {t.href && (
                <Link href={t.href} onClick={() => dismiss(t.id)} style={{ fontSize: "0.82rem", color: "var(--text-0)", fontWeight: 700, display: "inline-block", marginTop: "0.4rem" }}>
                  View →
                </Link>
              )}
            </div>
            <button onClick={() => dismiss(t.id)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#94a3b8", padding: 0, height: 16 }}>
              <X size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

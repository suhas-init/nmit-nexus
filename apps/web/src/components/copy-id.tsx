"use client";
import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopyId({ value, label = "ID" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });
  };
  return (
    <button onClick={copy} className="mono" style={{
      display: "inline-flex", alignItems: "center", gap: "0.35rem",
      background: "var(--bg-2)", border: "1px solid var(--border-0)",
      padding: "0.25rem 0.5rem", borderRadius: 4, cursor: "pointer",
      fontSize: "0.68rem", color: "var(--text-2)", letterSpacing: "0.08em",
      transition: "all 0.15s",
    }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-2)"; e.currentTarget.style.color = "var(--text-0)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-0)"; e.currentTarget.style.color = "var(--text-2)"; }}
    >
      {copied ? <Check size={11} style={{ color: "var(--green)" }} /> : <Copy size={11} />}
      {copied ? "copied" : `${label.toLowerCase()} · ${value.slice(0, 6)}`}
    </button>
  );
}

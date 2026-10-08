"use client";
import Link from "next/link";
import { Loader2, AlertTriangle, PackageOpen } from "lucide-react";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="card" style={{ padding: "3rem 1.5rem", textAlign: "center" }}>
      <Loader2 size={22} className="spin" style={{ color: "var(--accent)", margin: "0 auto 0.75rem" }} />
      <div className="mono" style={{ fontSize: "0.8rem", color: "var(--text-2)", letterSpacing: "0.1em" }}>{label.toUpperCase()}</div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  cta,
}: {
  icon?: React.ReactNode;
  title: string;
  body?: string;
  cta?: { label: string; href: string };
}) {
  return (
    <div className="card" style={{ padding: "3rem 1.5rem", textAlign: "center" }}>
      <div style={{ display: "grid", placeItems: "center", marginBottom: "0.85rem", color: "var(--text-2)" }}>
        {icon ?? <PackageOpen size={36} />}
      </div>
      <div style={{ fontWeight: 700, color: "var(--text-0)", marginBottom: "0.35rem", fontSize: "1rem" }}>{title}</div>
      {body && <div style={{ fontSize: "0.9rem", color: "var(--text-1)", maxWidth: 420, margin: "0 auto", lineHeight: 1.6 }}>{body}</div>}
      {cta && (
        <Link href={cta.href} className="btn btn-primary" style={{ marginTop: "1.25rem" }}>
          {cta.label}
        </Link>
      )}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", body, retry }: { title?: string; body?: string; retry?: () => void }) {
  return (
    <div className="card" style={{ padding: "3rem 1.5rem", textAlign: "center" }}>
      <AlertTriangle size={32} style={{ color: "var(--red)", margin: "0 auto 0.85rem" }} />
      <div style={{ fontWeight: 700, color: "var(--text-0)", marginBottom: "0.35rem" }}>{title}</div>
      {body && <div style={{ fontSize: "0.9rem", color: "var(--text-1)" }}>{body}</div>}
      {retry && (
        <button className="btn btn-outline" onClick={retry} style={{ marginTop: "1.25rem" }}>
          Try again
        </button>
      )}
    </div>
  );
}

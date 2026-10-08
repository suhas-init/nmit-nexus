"use client";
import Link from "next/link";
import { useAuth } from "@/store/auth";
import { AlertTriangle, X } from "lucide-react";
import { useEffect, useState } from "react";

export function VerifyBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDismissed(sessionStorage.getItem("verify-banner-dismissed") === "1");
  }, []);

  const dismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("verify-banner-dismissed", "1");
  };

  if (!user || user.email_verified || dismissed) return null;

  return (
    <div style={{
      background: "rgba(242, 183, 5, 0.08)",
      border: "1px solid rgba(242, 183, 5, 0.25)",
      borderRadius: 10,
      padding: "0.85rem 1rem",
      marginBottom: "1.5rem",
      display: "flex",
      alignItems: "center",
      gap: "0.75rem",
      fontSize: "0.88rem",
    }}>
      <AlertTriangle size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
      <div style={{ flex: 1, color: "var(--text-0)" }}>
        <strong>Verify your email</strong> to unlock posting, offering, and messaging.
      </div>
      <Link href="/verify" className="btn btn-primary" style={{ padding: "0.4rem 0.85rem", fontSize: "0.75rem" }}>
        Verify now
      </Link>
      <button onClick={dismiss} style={{ background: "transparent", border: "none", color: "var(--text-2)", cursor: "pointer", padding: 0 }}>
        <X size={14} />
      </button>
    </div>
  );
}

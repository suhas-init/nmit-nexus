"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/store/auth";
import { api } from "@/lib/api";
import { MailCheck, Loader2 } from "lucide-react";

export default function VerifyPage() {
  const router = useRouter();
  const { user, accessToken, fetchMe } = useAuth();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const submit = async () => {
    if (code.length !== 6 || !accessToken) return;
    setBusy(true); setErr(null);
    try {
      await api.post("/auth/verify-email", { code }, accessToken);
      await fetchMe();
      router.push("/marketplace");
    } catch (e: any) {
      setErr(e.detail || "Invalid code");
    } finally { setBusy(false); }
  };

  const resend = async () => {
    if (!accessToken) return;
    try {
      await api.post("/auth/resend-code", {}, accessToken);
      setResent(true);
      setTimeout(() => setResent(false), 6000);
    } catch {}
  };

  if (!user) {
    return (
      <div className="card" style={{ padding: "2rem", maxWidth: 460, margin: "3rem auto", textAlign: "center" }}>
        <div style={{ fontWeight: 700, color: "var(--text-0)", marginBottom: "0.5rem" }}>Sign in first</div>
        <Link href="/login" className="btn btn-primary">Login</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 460, margin: "3rem auto" }}>
      <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 52, height: 52, borderRadius: 12, background: "var(--bg-2)", border: "1px solid var(--border-1)", marginBottom: "1rem" }}>
          <MailCheck size={22} style={{ color: "var(--accent)" }} />
        </div>
        <div className="term-label" style={{ marginBottom: "0.5rem" }}>VERIFY_EMAIL</div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-0)", marginBottom: "0.5rem", letterSpacing: "-0.02em" }}>
          Check your inbox
        </h1>
        <p style={{ fontSize: "0.9rem", color: "var(--text-1)", marginBottom: "1.75rem", lineHeight: 1.6 }}>
          We sent a 6-digit code to <strong style={{ color: "var(--text-0)" }}>{user.email}</strong>.
        </p>

        {err && <div className="mono" style={{ padding: "0.6rem 0.85rem", background: "rgba(248,113,113,0.08)", color: "var(--red)", borderRadius: 6, fontSize: "0.78rem", marginBottom: "1rem", border: "1px solid rgba(248,113,113,0.2)" }}>{err}</div>}

        <input
          className="input"
          style={{ textAlign: "center", fontSize: "1.6rem", letterSpacing: "0.5em", fontFamily: "var(--font-mono)", paddingLeft: "0.5em", marginBottom: "1rem" }}
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          autoFocus
        />

        <button className="btn btn-primary" style={{ width: "100%" }} onClick={submit} disabled={busy || code.length !== 6}>
          {busy ? <><Loader2 size={14} className="spin" /> Verifying…</> : "Verify email"}
        </button>

        <div style={{ marginTop: "1rem", fontSize: "0.82rem", color: "var(--text-2)" }}>
          Didn't get it?{" "}
          <button onClick={resend} style={{ background: "transparent", border: "none", color: "var(--accent)", cursor: "pointer", fontWeight: 600, textDecoration: "underline", fontSize: "0.82rem" }}>
            {resent ? "Sent ✓" : "Resend code"}
          </button>
        </div>

        <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border-0)", fontSize: "0.78rem", color: "var(--text-2)" }}>
          <Link href="/marketplace" style={{ color: "var(--text-1)" }}>Skip for now →</Link>
        </div>
      </div>
    </div>
  );
}

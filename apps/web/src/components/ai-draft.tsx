"use client";
import { useState } from "react";
import { api, Category } from "@/lib/api";
import { useAuth } from "@/store/auth";
import { Sparkles, Loader2, Check, X } from "lucide-react";

export type Draft = {
  title: string;
  description: string;
  suggested_price_min: number;
  suggested_price_max: number;
  condition: string;
  category_slug: string;
  tags: string[];
};

export function AiDraft({
  categories,
  onAccept,
}: {
  categories: Category[] | undefined;
  onAccept: (draft: Draft, categoryId: string | null) => void;
}) {
  const { accessToken } = useAuth();
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const run = async () => {
    if (!accessToken || text.trim().length < 5) return;
    setBusy(true); setErr(null); setDraft(null);
    try {
      const d = await api.post<Draft>("/ai/listing-draft", { description: text.trim() }, accessToken);
      setDraft(d);
    } catch (e: any) {
      setErr(e.detail || "Couldn't generate a draft. Try rephrasing.");
    } finally { setBusy(false); }
  };

  const accept = () => {
    if (!draft) return;
    const cat = categories?.find((c) => c.slug === draft.category_slug);
    onAccept(draft, cat?.id || null);
    setDraft(null);
    setText("");
  };

  return (
    <div className="card spotlight" style={{
      padding: "1.25rem",
      marginBottom: "1rem",
      background: "linear-gradient(135deg, rgba(139,92,246,0.10) 0%, rgba(34,211,238,0.06) 100%)",
      borderColor: "rgba(139,92,246,0.30)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.6rem", fontWeight: 700, color: "var(--violet)", fontSize: "0.85rem", fontFamily: "var(--font-mono)", letterSpacing: "0.05em" }}>
        <Sparkles size={15} /> AUTO_LIST
      </div>
      <div style={{ fontSize: "0.82rem", color: "var(--text-1)", marginBottom: "0.75rem" }}>
        Type rough words. Get a clean listing draft — title, description, price range, category.
      </div>
      <textarea
        className="textarea"
        rows={2}
        placeholder="e.g. used casio fx-991cw bought last year, good condition, bill available"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.6rem" }}>
        <button type="button" className="btn btn-violet" onClick={run} disabled={busy || text.trim().length < 5}>
          {busy ? <Loader2 size={15} className="spin" /> : <Sparkles size={15} />}
          {busy ? "Thinking…" : "Generate draft"}
        </button>
      </div>

      {err && <div style={{ marginTop: "0.75rem", color: "var(--red)", fontSize: "0.85rem", fontFamily: "var(--font-mono)" }}>{err}</div>}

      {draft && (
        <div style={{ marginTop: "1rem", padding: "1rem", background: "var(--bg-2)", borderRadius: 10, border: "1px solid var(--border-1)" }}>
          <div className="term-label" style={{ marginBottom: "0.6rem" }}>DRAFT_PREVIEW</div>
          <div style={{ fontWeight: 700, color: "var(--text-0)", fontSize: "1rem", marginBottom: "0.4rem" }}>{draft.title}</div>
          <div style={{ fontSize: "0.85rem", color: "var(--text-1)", marginBottom: "0.85rem", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{draft.description}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.85rem" }}>
            <span className="badge badge-active">₹{draft.suggested_price_min}–{draft.suggested_price_max}</span>
            <span className="badge badge-condition">{draft.condition.replace("_", " ")}</span>
            <span className="badge badge-violet">{draft.category_slug}</span>
            {draft.tags?.slice(0, 3).map((t) => (
              <span key={t} className="badge badge-condition">#{t}</span>
            ))}
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="button" className="btn btn-primary" onClick={accept} style={{ padding: "0.45rem 0.9rem", fontSize: "0.75rem" }}>
              <Check size={13} /> Use this draft
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setDraft(null)} style={{ padding: "0.45rem 0.9rem", fontSize: "0.75rem" }}>
              <X size={13} /> Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

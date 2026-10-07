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
    <div className="card" style={{ padding: "1.25rem", marginBottom: "1rem", background: "linear-gradient(135deg, #f7f8fb 0%, #eef4ff 100%)", borderColor: "#dde3ed" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.6rem", fontWeight: 700, color: "var(--navy)", fontSize: "0.9rem" }}>
        <Sparkles size={16} /> AI Listing Copilot
      </div>
      <div style={{ fontSize: "0.82rem", color: "#64748b", marginBottom: "0.75rem" }}>
        Describe your item in rough words. I'll write the title, description, price range, and pick a category.
      </div>
      <textarea
        className="textarea"
        rows={2}
        placeholder="e.g. used casio fx-991cw bought last year, good condition, bill available"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.6rem" }}>
        <button type="button" className="btn btn-primary" onClick={run} disabled={busy || text.trim().length < 5}>
          {busy ? <Loader2 size={15} className="spin" /> : <Sparkles size={15} />}
          {busy ? "Thinking…" : "Generate draft"}
        </button>
      </div>

      {err && <div style={{ marginTop: "0.75rem", color: "#b42318", fontSize: "0.85rem" }}>{err}</div>}

      {draft && (
        <div style={{ marginTop: "1rem", padding: "1rem", background: "white", borderRadius: 10, border: "1px solid var(--border)" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: "0.5rem" }}>Preview</div>
          <div style={{ fontWeight: 700, color: "var(--navy)", fontSize: "1rem", marginBottom: "0.4rem" }}>{draft.title}</div>
          <div style={{ fontSize: "0.85rem", color: "#334155", marginBottom: "0.75rem", whiteSpace: "pre-wrap" }}>{draft.description}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.75rem" }}>
            <span className="badge badge-active">
              ₹{draft.suggested_price_min}–{draft.suggested_price_max}
            </span>
            <span className="badge badge-condition">{draft.condition.replace("_", " ")}</span>
            <span className="badge badge-verified">{draft.category_slug}</span>
            {draft.tags?.slice(0, 3).map((t) => (
              <span key={t} className="badge badge-condition">#{t}</span>
            ))}
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="button" className="btn btn-primary" onClick={accept} style={{ padding: "0.4rem 0.85rem", fontSize: "0.85rem" }}>
              <Check size={14} /> Use this draft
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setDraft(null)} style={{ padding: "0.4rem 0.85rem", fontSize: "0.85rem" }}>
              <X size={14} /> Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";
import { useState, useRef, useEffect } from "react";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";

const CLOUD = "wq0up9xg";
const PRESET = "nmit_unsigned";

export function ImageUploader({
  urls,
  onChange,
  max = 5,
}: {
  urls: string[];
  onChange: (urls: string[]) => void;
  max?: number;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (files: FileList) => {
    if (!CLOUD || !PRESET) {
      setErr("Image upload not configured");
      return;
    }
    setBusy(true); setErr(null);
    const next = [...urls];
    try {
      for (const file of Array.from(files).slice(0, max - urls.length)) {
        if (file.size > 5 * 1024 * 1024) { setErr(`${file.name} is over 5MB`); continue; }
        const fd = new FormData();
        fd.append("file", file);
        fd.append("upload_preset", PRESET);
        fd.append("folder", "nmit-nexus");
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, { method: "POST", body: fd });
        if (!res.ok) throw new Error("upload failed");
        const data = await res.json();
        next.push(data.secure_url);
        onChange([...next]);
      }
    } catch (e: any) {
      setErr(e.message || "Upload failed");
    } finally { setBusy(false); }
  };

  const remove = (url: string) => onChange(urls.filter((u) => u !== url));

  return (
    <div>
      <div className="term-label" style={{ marginBottom: "0.5rem" }}>IMAGES (max {max})</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: "0.5rem" }}>
        {urls.map((u) => (
          <div key={u} className="thumb" style={{ position: "relative", aspectRatio: "1", borderRadius: 8, overflow: "hidden" }}>
            <img src={u} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <button type="button" onClick={() => remove(u)} style={{
              position: "absolute", top: 4, right: 4, width: 20, height: 20,
              borderRadius: "50%", background: "rgba(0,0,0,0.75)", color: "white",
              border: "none", cursor: "pointer", display: "grid", placeItems: "center",
            }}><X size={11} /></button>
          </div>
        ))}

        {urls.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="thumb"
            style={{
              aspectRatio: "1", borderRadius: 8, cursor: "pointer",
              border: "1px dashed var(--border-1)", background: "transparent",
              display: "grid", placeItems: "center", gap: "0.25rem",
              color: "var(--text-2)", flexDirection: "column",
            }}
          >
            {busy ? <Loader2 size={16} className="spin" /> : (
              <>
                <Upload size={16} />
                <span className="mono" style={{ fontSize: "0.62rem" }}>UPLOAD</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={(e) => e.target.files && upload(e.target.files)}
      />

      {err && <div className="mono" style={{ fontSize: "0.72rem", color: "var(--red)", marginTop: "0.5rem" }}>{err}</div>}
    </div>
  );
}

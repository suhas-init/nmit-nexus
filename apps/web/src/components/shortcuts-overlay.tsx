"use client";
import { useEffect, useState } from "react";
import { X, Command } from "lucide-react";

const SHORTCUTS = [
  { keys: ["⌘", "K"], label: "Open command palette", mac: true },
  { keys: ["Ctrl", "K"], label: "Open command palette", mac: false },
  { keys: ["?"], label: "Show this panel", mac: null },
  { keys: ["G", "H"], label: "Go home" },
  { keys: ["G", "M"], label: "Go marketplace" },
  { keys: ["G", "W"], label: "Go wanted" },
  { keys: ["G", "C"], label: "Go conversations" },
  { keys: ["G", "P"], label: "Go profile" },
  { keys: ["Esc"], label: "Close dialogs" },
  { keys: ["/"], label: "Focus search" },
];

export function ShortcutsOverlay() {
  const [open, setOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(navigator.platform.toLowerCase().includes("mac"));
    let pendingG = false;
    let gTimer: any = null;

    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable;
      if (typing) return;

      if (e.key === "?") {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }

      const routes: Record<string, string> = {
        h: "/",
        m: "/marketplace",
        w: "/wanted",
        c: "/conversations",
        p: "/profile",
        o: "/offers",
        s: "/sell",
        d: "/dashboard",
        f: "/favourites",
        a: "/ai",
      };

      if (e.key.toLowerCase() === "g") {
        pendingG = true;
        clearTimeout(gTimer);
        gTimer = setTimeout(() => { pendingG = false; }, 1500);
        return;
      }
      if (pendingG && routes[e.key.toLowerCase()]) {
        pendingG = false;
        clearTimeout(gTimer);
        window.location.href = routes[e.key.toLowerCase()];
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!open) return null;

  const visible = SHORTCUTS.filter((s) => s.mac === null || s.mac === isMac);

  return (
    <div
      onClick={() => setOpen(false)}
      style={{
        position: "fixed", inset: 0, zIndex: 350,
        background: "rgba(8, 9, 11, 0.7)", backdropFilter: "blur(8px)",
        display: "grid", placeItems: "center", padding: "1rem",
        animation: "fadeIn 0.15s ease",
      }}
    >
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 480, padding: "1.5rem",
          boxShadow: "0 30px 80px -20px rgba(0,0,0,0.7)",
          animation: "modalIn 0.25s cubic-bezier(0.2, 0.9, 0.3, 1)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Command size={16} style={{ color: "var(--accent)" }} />
            <span className="mono" style={{ fontSize: "0.78rem", color: "var(--text-0)", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600 }}>
              Keyboard shortcuts
            </span>
          </div>
          <button onClick={() => setOpen(false)} className="btn btn-outline" style={{ padding: "0.25rem 0.5rem" }}>
            <X size={12} />
          </button>
        </div>

        <div style={{ display: "grid", gap: "0.4rem" }}>
          {visible.map((s, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "0.6rem 0.75rem", borderRadius: 6,
              background: i % 2 === 0 ? "var(--bg-2)" : "transparent",
            }}>
              <span style={{ fontSize: "0.88rem", color: "var(--text-1)" }}>{s.label}</span>
              <div style={{ display: "flex", gap: "0.3rem" }}>
                {s.keys.map((k, j) => (
                  <kbd key={j} className="mono" style={{
                    fontSize: "0.7rem", fontWeight: 600,
                    padding: "0.2rem 0.5rem",
                    border: "1px solid var(--border-1)",
                    borderRadius: 4,
                    background: "var(--bg-3)",
                    color: "var(--text-0)",
                    minWidth: 24, textAlign: "center",
                  }}>{k}</kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mono" style={{ fontSize: "0.62rem", color: "var(--text-2)", letterSpacing: "0.12em", marginTop: "1rem", textAlign: "center", textTransform: "uppercase" }}>
          PRESS <kbd style={{ padding: "0.1rem 0.35rem", border: "1px solid var(--border-1)", borderRadius: 3 }}>?</kbd> TO TOGGLE
        </div>
      </div>
    </div>
  );
}

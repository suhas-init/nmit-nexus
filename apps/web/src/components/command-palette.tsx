"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Package, Sparkles, Megaphone, PlusCircle, LayoutDashboard, Inbox, MessageSquare, Home, X } from "lucide-react";

const COMMANDS = [
  { group: "Navigate", items: [
    { label: "Home", href: "/", icon: Home, keywords: "start index" },
    { label: "Marketplace", href: "/marketplace", icon: Package, keywords: "browse listings shop" },
    { label: "AI Search", href: "/ai", icon: Sparkles, keywords: "assistant natural language" },
    { label: "Wanted", href: "/wanted", icon: Megaphone, keywords: "demand request" },
    { label: "Sell an item", href: "/sell", icon: PlusCircle, keywords: "post create new listing" },
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, keywords: "my listings profile" },
    { label: "Offers", href: "/offers", icon: Inbox, keywords: "inbox bids" },
    { label: "Messages", href: "/conversations", icon: MessageSquare, keywords: "chat" },
  ]},
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 50); setQ(""); setActive(0); }
  }, [open]);

  const flat = COMMANDS.flatMap((g) => g.items.map((i) => ({ ...i, group: g.group })));
  const filtered = q.trim()
    ? flat.filter((c) =>
        c.label.toLowerCase().includes(q.toLowerCase()) ||
        c.keywords.toLowerCase().includes(q.toLowerCase())
      )
    : flat;

  useEffect(() => { setActive(0); }, [q]);

  const run = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter" && filtered[active]) { e.preventDefault(); run(filtered[active].href); }
  };

  if (!open) return null;

  return (
    <div
      onMouseDown={() => setOpen(false)}
      className="cmd-palette-wrap" style={{ position: "fixed", inset: 0, background: "rgba(8,9,11,0.75)", backdropFilter: "blur(6px)", zIndex: 300, display: "grid", placeItems: "start center", paddingTop: "12vh" }}
    >
      <div
        className="card cmd-palette"
        onMouseDown={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 560, overflow: "hidden", borderColor: "var(--border-1)", boxShadow: "0 30px 80px -20px rgba(0,0,0,0.7)" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.9rem 1rem", borderBottom: "1px solid var(--border-0)" }}>
          <Search size={15} style={{ color: "var(--text-2)" }} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search pages, actions…"
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--text-0)", fontSize: "0.9rem" }}
          />
          <span className="mono" style={{ fontSize: "0.62rem", color: "var(--text-2)", padding: "0.15rem 0.4rem", border: "1px solid var(--border-1)", borderRadius: 4, letterSpacing: "0.1em" }}>ESC</span>
        </div>

        <div style={{ maxHeight: 360, overflowY: "auto", padding: "0.4rem" }}>
          {filtered.length === 0 && (
            <div style={{ padding: "2rem 1rem", textAlign: "center", color: "var(--text-2)", fontSize: "0.85rem" }}>
              No results for "{q}"
            </div>
          )}
          {filtered.map((c, i) => {
            const Icon = c.icon;
            const isActive = i === active;
            return (
              <button
                key={c.href}
                onMouseEnter={() => setActive(i)}
                onClick={() => run(c.href)}
                style={{
                  display: "flex", alignItems: "center", gap: "0.75rem",
                  width: "100%", textAlign: "left", padding: "0.65rem 0.75rem",
                  borderRadius: 6, border: "none", cursor: "pointer",
                  background: isActive ? "var(--bg-2)" : "transparent",
                  color: isActive ? "var(--text-0)" : "var(--text-1)",
                  fontSize: "0.88rem", transition: "background 0.1s",
                }}
              >
                <Icon size={15} style={{ color: isActive ? "var(--accent)" : "var(--text-2)" }} />
                <span style={{ flex: 1 }}>{c.label}</span>
                <span className="mono" style={{ fontSize: "0.62rem", color: "var(--text-2)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  {c.group}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mono" style={{ display: "flex", gap: "1rem", padding: "0.6rem 1rem", borderTop: "1px solid var(--border-0)", fontSize: "0.62rem", color: "var(--text-2)", letterSpacing: "0.1em" }}>
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>ESC close</span>
        </div>
      </div>
    </div>
  );
}

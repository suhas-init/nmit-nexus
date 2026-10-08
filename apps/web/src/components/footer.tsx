export function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--border-0)", background: "var(--bg-1)", marginTop: "4rem" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "1.75rem 1rem", display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "center", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, color: "var(--text-0)", fontSize: "0.9rem", fontFamily: "var(--font-mono)" }}>
          <span style={{ width: 22, height: 22, borderRadius: 5, background: "var(--accent)", color: "var(--bg-0)", display: "grid", placeItems: "center", fontWeight: 900, fontSize: "0.75rem" }}>N</span>
          nmit_nexus
        </div>
        <div className="mono" style={{ fontSize: "0.7rem", color: "var(--text-2)", maxWidth: 720, lineHeight: 1.7 }}>
          Verified campus marketplace · AI-assisted search · QR-verified handovers · P2P voice calls
        </div>
        <div className="mono" style={{ fontSize: "0.72rem", color: "var(--text-2)", maxWidth: 620, marginTop: "0.35rem" }}>
          A student project. Not officially affiliated with Nitte Meenakshi Institute of Technology.
        </div>
        <div className="mono" style={{ fontSize: "0.68rem", color: "var(--text-2)" }}>
          GDG Club Selection · Round 2 · 2026
        </div>
      </div>
    </footer>
  );
}

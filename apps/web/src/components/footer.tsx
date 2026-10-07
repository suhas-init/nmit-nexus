export function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--border)", background: "white", marginTop: "4rem" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "1.5rem 1rem", display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "center", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, color: "var(--navy)", fontSize: "0.95rem" }}>
          <span style={{ width: 22, height: 22, borderRadius: 6, background: "var(--navy)", color: "var(--gold)", display: "grid", placeItems: "center", fontWeight: 900, fontSize: "0.75rem" }}>N</span>
          NMIT Nexus
        </div>
        <div style={{ fontSize: "0.78rem", color: "var(--slate)", maxWidth: 620 }}>
          A student project. Not officially affiliated with Nitte Meenakshi Institute of Technology.
        </div>
        <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
          Built for the GDG Club Selection · Round 2 · 2026
        </div>
      </div>
    </footer>
  );
}

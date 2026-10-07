import Link from "next/link";

export default function Home() {
  return (
    <div>
      <section style={{ padding: "4rem 0 3rem", textAlign: "center" }}>
        <div className="badge badge-verified" style={{ marginBottom: "1rem" }}>NMIT verified · Campus-only</div>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 800, color: "var(--navy)", lineHeight: 1.1, marginBottom: "1rem" }}>
          Buy, sell, or find it <span style={{ color: "var(--gold)" }}>on campus.</span>
        </h1>
        <p style={{ fontSize: "1.1rem", maxWidth: 620, margin: "0 auto 2rem", color: "var(--slate)" }}>
          The trusted campus commerce OS for NMIT. Real listings from real students. Verified handovers. Campus-safe meetups.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/marketplace" className="btn btn-primary" style={{ padding: "0.8rem 1.5rem" }}>Browse marketplace</Link>
          <Link href="/sell" className="btn btn-gold" style={{ padding: "0.8rem 1.5rem" }}>Post an item</Link>
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginTop: "3rem" }}>
        {[
          { t: "Verified students", d: "Campus email = trust badge." },
          { t: "QR-verified handovers", d: "Cryptographic proof both parties met." },
          { t: "Timetable meetups", d: "Slots that fit around your classes." },
          { t: "Campus-only zones", d: "Library, canteens, gates. No home addresses." },
        ].map((f) => (
          <div key={f.t} className="card" style={{ padding: "1.25rem" }}>
            <div style={{ fontWeight: 700, color: "var(--navy)", marginBottom: "0.35rem" }}>{f.t}</div>
            <div style={{ fontSize: "0.9rem" }}>{f.d}</div>
          </div>
        ))}
      </section>
    </div>
  );
}

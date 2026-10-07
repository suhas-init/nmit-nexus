"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DotGrid } from "@/components/dot-grid";
import { Magnetic } from "@/components/magnetic";

const MARQUEE = [
  "24 LISTINGS ACTIVE",
  "3 HANDOVERS VERIFIED TODAY",
  "12 STUDENTS ONLINE",
  "AI SEARCH LIVE",
  "QR VERIFICATION ACTIVE",
  "WANTED POSTS OPEN",
  "CAMPUS-ONLY · NMIT VERIFIED",
];

const FEATURES = [
  { title: "QR-verified handover", desc: "Cryptographic proof both parties met. Receipt hash on both sides.", tag: "trust" },
  { title: "AI natural search", desc: "Describe it in words. We extract the filters and find it.", tag: "ai" },
  { title: "Wanted posts", desc: "Post what you need. Sellers bid. Best price wins.", tag: "demand" },
  { title: "Price pulse", desc: "Median of comparable campus listings.", tag: "data" },
  { title: "Realtime", desc: "Offers, chat, handovers — no refresh.", tag: "live" },
  { title: "Campus-only", desc: "@nmit.ac.in verified. No strangers.", tag: "safe" },
];

function Typewriter({ words }: { words: string[] }) {
  const [i, setI] = useState(0);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    const current = words[i % words.length];
    const speed = deleting ? 40 : 90;
    const timer = setTimeout(() => {
      if (!deleting) {
        setText(current.slice(0, text.length + 1));
        if (text.length + 1 === current.length) setTimeout(() => setDeleting(true), 1500);
      } else {
        setText(current.slice(0, text.length - 1));
        if (text.length - 1 === 0) { setDeleting(false); setI((p) => p + 1); }
      }
    }, speed);
    return () => clearTimeout(timer);
  }, [text, deleting, i, words]);
  return <span style={{ color: "var(--accent)" }}>{text}<span className="cursor-blink">_</span></span>;
}

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("in"); });
    }, { threshold: 0.12 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

export default function Home() {
  useReveal();

  return (
    <div style={{ position: "relative" }}>
      {/* Marquee */}
      <div style={{ overflow: "hidden", borderBottom: "1px solid var(--border-0)", borderTop: "1px solid var(--border-0)", padding: "0.5rem 0", background: "var(--bg-1)", marginLeft: -16, marginRight: -16, marginTop: -24 }}>
        <div className="marquee">
          {[...MARQUEE, ...MARQUEE].map((item, i) => (
            <span key={i} className="mono" style={{ fontSize: "0.68rem", color: "var(--text-2)", letterSpacing: "0.14em", padding: "0 1.75rem" }}>
              <span style={{ color: "var(--accent)" }}>◆</span> {item}
            </span>
          ))}
        </div>
      </div>

      {/* Hero — split with interactive dot grid */}
      <section className="hero-split" style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: "3rem", alignItems: "center", padding: "5rem 0 4rem", maxWidth: 1200, margin: "0 auto" }}>
        <div>
          <div className="term-label fade-up" style={{ marginBottom: "1.5rem", animationDelay: "0.05s" }}>NMIT Exchange · 2026</div>

          <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(2.2rem, 4.5vw, 3.4rem)", fontWeight: 500, lineHeight: 1.08, letterSpacing: "-0.03em", marginBottom: "1.5rem", color: "var(--text-0)" }}>
            <span className="fade-up" style={{ display: "inline-block", animationDelay: "0.15s" }}>A campus marketplace</span><br />
            <span className="fade-up" style={{ display: "inline-block", animationDelay: "0.3s", color: "var(--text-1)" }}>built to</span>{" "}
            <span className="fade-up" style={{ display: "inline-block", animationDelay: "0.35s" }}>
              <Typewriter words={["verify.", "trust.", "trade.", "last."]} />
            </span>
          </h1>

          <p className="fade-up" style={{ fontSize: "1rem", maxWidth: 520, color: "var(--text-1)", marginBottom: "2.25rem", lineHeight: 1.65, animationDelay: "0.45s" }}>
            Buy and sell within your verified NMIT community. Real handovers with cryptographic proof,
            AI search that understands plain English, and no strangers.
          </p>

          <div className="fade-up" style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", animationDelay: "0.6s" }}>
            <Magnetic><Link href="/marketplace" className="btn btn-primary">Browse marketplace →</Link></Magnetic>
            <Magnetic><Link href="/ai" className="btn btn-outline">Ask AI</Link></Magnetic>
          </div>

          <div className="fade-up" style={{ display: "flex", gap: "1.5rem", marginTop: "2.5rem", animationDelay: "0.75s" }}>
            <div>
              <div className="mono" style={{ fontSize: "1.4rem", fontWeight: 500, color: "var(--text-0)" }}>0</div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: "0.15rem" }}>fake transactions</div>
            </div>
            <div style={{ width: 1, background: "var(--border-1)" }} />
            <div>
              <div className="mono" style={{ fontSize: "1.4rem", fontWeight: 500, color: "var(--text-0)" }}>100%</div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: "0.15rem" }}>verified</div>
            </div>
            <div style={{ width: 1, background: "var(--border-1)" }} />
            <div>
              <div className="mono" style={{ fontSize: "1.4rem", fontWeight: 500, color: "var(--text-0)" }}>NMIT</div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: "0.15rem" }}>campus only</div>
            </div>
          </div>
        </div>

        {/* Interactive dot grid panel */}
        <div className="fade-up hero-dotgrid" style={{ animationDelay: "0.4s" }}>
          <div style={{
            position: "relative",
            aspectRatio: "1 / 1",
            borderRadius: 14,
            border: "1px solid var(--border-0)",
            overflow: "hidden",
            background: "var(--bg-1)",
          }}>
            <DotGrid style={{ position: "absolute", inset: 0 }} />
            {/* Corner labels */}
            <div className="mono" style={{ position: "absolute", top: 14, left: 16, fontSize: "0.62rem", color: "var(--text-2)", letterSpacing: "0.14em" }}>
              LIVE_GRID
            </div>
            <div className="mono" style={{ position: "absolute", top: 14, right: 16, fontSize: "0.62rem", color: "var(--accent)", letterSpacing: "0.14em", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span className="pulse-dot" /> ACTIVE
            </div>
            <div className="mono" style={{ position: "absolute", bottom: 14, left: 16, fontSize: "0.62rem", color: "var(--text-2)", letterSpacing: "0.14em" }}>
              HOVER · MOVE
            </div>
            <div className="mono" style={{ position: "absolute", bottom: 14, right: 16, fontSize: "0.62rem", color: "var(--text-2)", letterSpacing: "0.14em" }}>
              v1.0
            </div>
            {/* Center content */}
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center", pointerEvents: "none" }}>
              <div>
                <div className="mono" style={{ fontSize: "0.7rem", color: "var(--text-2)", letterSpacing: "0.18em", marginBottom: "0.5rem" }}>CAMPUS_COMMERCE_OS</div>
                <div className="mono" style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 500, color: "var(--text-0)", letterSpacing: "-0.02em" }}>
                  <span style={{ color: "var(--accent)" }}>verify</span>_each.trade
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature grid — clean, no gradients */}
      <section style={{ maxWidth: 1200, margin: "5rem auto 0", borderTop: "1px solid var(--border-0)", paddingTop: "3rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "2rem" }}>
          <div className="term-label">WHAT_MAKES_IT_DIFFERENT</div>
          <div className="mono" style={{ fontSize: "0.68rem", color: "var(--text-2)", letterSpacing: "0.14em" }}>06_ITEMS</div>
        </div>

        <div className="grid-features" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0 }}>
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className="reveal lift"
              style={{
                padding: "1.75rem 1.5rem",
                borderRight: (i + 1) % 3 === 0 ? "none" : "1px solid var(--border-0)",
                borderBottom: i < 3 ? "1px solid var(--border-0)" : "none",
                transitionDelay: `${i * 0.04}s`,
                background: "var(--bg-1)",
              }}
            >
              <div className="mono" style={{ fontSize: "0.62rem", color: "var(--text-2)", letterSpacing: "0.14em", marginBottom: "1rem", textTransform: "uppercase" }}>
                {String(i + 1).padStart(2, "0")} · {f.tag}
              </div>
              <div style={{ fontSize: "1rem", fontWeight: 500, color: "var(--text-0)", marginBottom: "0.5rem", letterSpacing: "-0.01em" }}>
                {f.title}
              </div>
              <div style={{ fontSize: "0.86rem", color: "var(--text-1)", lineHeight: 1.6 }}>
                {f.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA — minimal */}
      <section className="reveal" style={{ maxWidth: 900, margin: "6rem auto 0", textAlign: "center", padding: "3rem 2rem", border: "1px solid var(--border-0)", borderRadius: 14, background: "var(--bg-1)" }}>
        <div className="term-label" style={{ marginBottom: "1rem" }}>GET_STARTED</div>
        <h2 style={{ fontSize: "clamp(1.4rem, 3vw, 1.9rem)", fontWeight: 500, color: "var(--text-0)", marginBottom: "0.6rem", letterSpacing: "-0.02em", fontFamily: "var(--font-mono)" }}>
          Verified students. Verified trades.
        </h2>
        <p style={{ fontSize: "0.92rem", color: "var(--text-1)", marginBottom: "1.75rem", maxWidth: 480, margin: "0 auto 1.75rem" }}>
          Sign up with your @nmit.ac.in email to get the verified badge and unlock every feature.
        </p>
        <div style={{ display: "flex", gap: "0.6rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/register" className="btn btn-primary">Create account</Link>
          <Link href="/marketplace" className="btn btn-outline">Explore listings</Link>
        </div>
      </section>
    </div>
  );
}

"use client";
import { useEffect, useRef } from "react";

export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);
  const ref2 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const el2 = ref2.current;
    if (!el || !el2) return;
    let raf = 0;
    let tx = window.innerWidth / 2, ty = window.innerHeight / 2;
    let x1 = tx, y1 = ty, x2 = tx, y2 = ty;

    const move = (e: MouseEvent) => { tx = e.clientX; ty = e.clientY; };
    const loop = () => {
      x1 += (tx - x1) * 0.14; y1 += (ty - y1) * 0.14;
      x2 += (tx - x2) * 0.06; y2 += (ty - y2) * 0.06;
      el.style.transform = `translate(${x1}px, ${y1}px) translate(-50%, -50%)`;
      el2.style.transform = `translate(${x2}px, ${y2}px) translate(-50%, -50%)`;
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener("mousemove", move);
    raf = requestAnimationFrame(loop);
    return () => { window.removeEventListener("mousemove", move); cancelAnimationFrame(raf); };
  }, []);

  return (
    <>
      <div ref={ref} aria-hidden style={{
        position: "fixed", width: 560, height: 560, borderRadius: "50%",
        pointerEvents: "none", zIndex: 1,
        background: "var(--cursor-glow-1)",
        willChange: "transform",
      }} />
      <div ref={ref2} aria-hidden style={{
        position: "fixed", width: 900, height: 900, borderRadius: "50%",
        pointerEvents: "none", zIndex: 1,
        background: "var(--cursor-glow-2)",
        willChange: "transform",
      }} />
    </>
  );
}

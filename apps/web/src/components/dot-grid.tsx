"use client";
import { useRef } from "react";

export function DotGrid({ style }: { style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  return <div ref={ref} onMouseMove={onMove} className="dot-grid" style={style} aria-hidden />;
}

"use client";
import { useEffect } from "react";

export function FeatureHoverTracker() {
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest(".feature-block") as HTMLElement | null;
      if (!target) return;
      const rect = target.getBoundingClientRect();
      target.style.setProperty("--mx", `${e.clientX - rect.left}px`);
      target.style.setProperty("--my", `${e.clientY - rect.top}px`);
    };
    window.addEventListener("mousemove", handle, { passive: true });
    return () => window.removeEventListener("mousemove", handle);
  }, []);
  return null;
}

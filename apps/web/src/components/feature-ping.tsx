"use client";
import { useEffect } from "react";

// Randomly pings a feature block with a brief vibrate+color flash.
// Only runs while the feature section is visible. Respects reduced-motion.
export function FeaturePing() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(hover: none)").matches) return; // skip on touch

    let stopped = false;
    let timer: any = null;
    let inView = false;

    const getBlocks = () =>
      Array.from(document.querySelectorAll<HTMLElement>(".feature-block:not(.feature-block--ping)"));

    const ping = () => {
      if (stopped || !inView) return;
      const blocks = getBlocks();
      if (blocks.length === 0) return;
      const pick = blocks[Math.floor(Math.random() * blocks.length)];
      pick.classList.add("feature-block--ping");
      setTimeout(() => pick.classList.remove("feature-block--ping"), 900);
    };

    const loop = () => {
      if (stopped) return;
      ping();
      // Random interval 2.2s – 4.5s between pings
      const delay = 2200 + Math.random() * 2300;
      timer = setTimeout(loop, delay);
    };

    // Only ping when at least one block is in viewport
    const io = new IntersectionObserver(
      (entries) => {
        const anyIn = entries.some((e) => e.isIntersecting);
        if (anyIn && !inView) {
          inView = true;
          // first ping shortly after entering view
          setTimeout(loop, 600);
        } else if (!anyIn && inView) {
          inView = false;
          if (timer) clearTimeout(timer);
        }
      },
      { threshold: 0.15 }
    );

    // Observe the feature grid wrapper (it will exist after page render)
    const attach = () => {
      const grid = document.querySelector(".grid-features");
      if (grid) io.observe(grid);
      else setTimeout(attach, 300);
    };
    attach();

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      io.disconnect();
    };
  }, []);

  return null;
}

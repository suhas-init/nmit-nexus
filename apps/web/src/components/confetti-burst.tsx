"use client";
import { useEffect } from "react";
import confetti from "canvas-confetti";

export function ConfettiBurst({ trigger }: { trigger: boolean }) {
  useEffect(() => {
    if (!trigger) return;
    const colors = ["#F2B705", "#F5F7FA", "#4ADE80", "#60A5FA"];
    const duration = 2500;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 60,
        origin: { x: 0, y: 0.7 },
        colors,
        disableForReducedMotion: true,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 60,
        origin: { x: 1, y: 0.7 },
        colors,
        disableForReducedMotion: true,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };

    confetti({
      particleCount: 80,
      spread: 100,
      origin: { y: 0.6 },
      colors,
      disableForReducedMotion: true,
    });

    frame();
  }, [trigger]);

  return null;
}

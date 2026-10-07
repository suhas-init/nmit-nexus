"use client";
import { useEffect } from "react";

export function ThemeBootstrap() {
  useEffect(() => {
    try {
      const raw = localStorage.getItem("nexus-theme");
      const t = raw ? JSON.parse(raw)?.state?.theme : "dark";
      document.documentElement.setAttribute("data-theme", t || "dark");
    } catch {
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);
  return null;
}

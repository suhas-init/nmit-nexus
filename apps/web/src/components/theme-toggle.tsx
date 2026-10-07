"use client";
import { useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/store/theme";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <button
      onClick={toggle}
      className="btn btn-outline"
      style={{ padding: "0.35rem 0.6rem", fontSize: "0.72rem" }}
      aria-label="Toggle theme"
      title={theme === "dark" ? "Switch to light" : "Switch to dark"}
    >
      {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
    </button>
  );
}

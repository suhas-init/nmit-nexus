"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "dark" | "light";

type Store = {
  theme: Theme;
  toggle: () => void;
  set: (t: Theme) => void;
};

export const useTheme = create<Store>()(
  persist(
    (set, get) => ({
      theme: "dark",
      toggle: () => {
        const next: Theme = get().theme === "dark" ? "light" : "dark";
        set({ theme: next });
        if (typeof document !== "undefined") {
          document.documentElement.setAttribute("data-theme", next);
        }
      },
      set: (t) => {
        set({ theme: t });
        if (typeof document !== "undefined") {
          document.documentElement.setAttribute("data-theme", t);
        }
      },
    }),
    { name: "nexus-theme" }
  )
);

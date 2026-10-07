"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api, User, setTokenRefreshHandler } from "@/lib/api";

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  setTokens: (access: string, refresh: string) => void;
  setUser: (user: User | null) => void;
  logout: () => void;
  fetchMe: () => Promise<void>;
};

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setTokens: (access, refresh) => set({ accessToken: access, refreshToken: refresh }),
      setUser: (user) => set({ user }),
      logout: () => set({ accessToken: null, refreshToken: null, user: null }),
      fetchMe: async () => {
        const token = get().accessToken;
        if (!token) return;
        try {
          const me = await api.get<User>("/auth/me", token);
          set({ user: me });
        } catch {
          set({ accessToken: null, refreshToken: null, user: null });
        }
      },
    }),
    { name: "nexus-auth" }
  )
);

// Wire refresh handler once — updates both tokens when api client silently refreshes
setTokenRefreshHandler(({ access, refresh }) => {
  useAuth.setState({ accessToken: access, refreshToken: refresh });
});

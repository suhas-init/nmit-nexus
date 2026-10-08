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
      logout: () => { try { sessionStorage.removeItem("nexus-verified-flag"); } catch {} set({ accessToken: null, refreshToken: null, user: null }); },
      fetchMe: async () => {
        const token = get().accessToken;
        if (!token) { set({ user: null }); return; }
        try {
          const me = await api.get<User>("/auth/me", token);
          set({ user: me });
          try {
            if (me.email_verified) sessionStorage.setItem("nexus-verified-flag", "1");
            else sessionStorage.removeItem("nexus-verified-flag");
          } catch {}
        } catch (e: any) {
          if (e?.status === 401) {
            set({ accessToken: null, refreshToken: null, user: null });
          }
        }
      },
    }),
    {
      name: "nexus-auth-v2",
      // ONLY persist tokens. user is always fetched fresh from the server.
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);

export function fullLogout() {
  useAuth.setState({ accessToken: null, refreshToken: null, user: null });
  try { localStorage.removeItem("nexus-auth"); } catch {}
}

setTokenRefreshHandler(({ access, refresh }) => {
  useAuth.setState({ accessToken: access, refreshToken: refresh });
});

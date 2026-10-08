"use client";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/store/auth";
import { Heart } from "lucide-react";

export function FavouriteButton({ listingId, size = 18 }: { listingId: string; size?: number }) {
  const { user, accessToken } = useAuth();
  const qc = useQueryClient();
  const [fav, setFav] = useState(false);
  const [loading, setLoading] = useState(false);
  const [init, setInit] = useState(true);

  useEffect(() => {
    if (!user || !accessToken) { setInit(false); return; }
    api.get<{ favourited: boolean }>(`/listings/${listingId}/favourite`, accessToken)
      .then((d) => setFav(d.favourited))
      .catch(() => {})
      .finally(() => setInit(false));
  }, [listingId, user, accessToken]);

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || !accessToken || loading) return;
    setLoading(true);
    const next = !fav;
    setFav(next);
    qc.invalidateQueries({ queryKey: ["favourites"] });
    try {
      if (next) await api.post(`/listings/${listingId}/favourite`, {}, accessToken);
      else await api.del(`/listings/${listingId}/favourite`, accessToken);
    } catch {
      setFav(!next);
    } finally { setLoading(false); }
  };

  if (!user) return null;

  return (
    <button
      onClick={toggle}
      disabled={loading || init}
      style={{
        width: 32, height: 32, borderRadius: "50%",
        background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)",
        border: "1px solid rgba(255,255,255,0.15)",
        display: "grid", placeItems: "center",
        cursor: "pointer",
        transition: "transform 0.15s, background 0.15s",
        transform: fav ? "scale(1.05)" : "scale(1)",
      }}
      aria-label={fav ? "Unfavourite" : "Favourite"}
    >
      <Heart
        size={size}
        fill={fav ? "#F2B705" : "none"}
        color={fav ? "#F2B705" : "white"}
        style={{ transition: "all 0.2s" }}
      />
    </button>
  );
}

"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export function ListingCardCover({ listingId, title }: { listingId: string; title: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ url: string }[]>(`/listings/${listingId}/images`)
      .then((imgs) => setUrl(imgs?.[0]?.url || null))
      .catch(() => setUrl(null))
      .finally(() => setLoading(false));
  }, [listingId]);

  if (loading) {
    return <div className="skeleton" style={{ height: 150 }} />;
  }

  if (!url) {
    return (
      <div className="thumb" style={{ height: 150, fontSize: "1.6rem" }}>
        {title.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <div style={{ height: 150, background: "var(--bg-2)", overflow: "hidden" }}>
      <img src={url} alt={title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
  );
}

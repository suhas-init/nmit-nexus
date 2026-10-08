"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Img = { id: string; url: string; sort_order: number };

export function ListingGallery({ listingId, fallback }: { listingId: string; fallback: string }) {
  const [images, setImages] = useState<Img[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Img[]>(`/listings/${listingId}/images`)
      .then((d) => setImages(d || []))
      .catch(() => setImages([]))
      .finally(() => setLoading(false));
  }, [listingId]);

  if (loading) {
    return <div className="skeleton" style={{ height: 320, borderRadius: 12, marginBottom: "1.25rem" }} />;
  }

  if (images.length === 0) {
    return (
      <div className="thumb" style={{ height: 320, borderRadius: 12, marginBottom: "1.25rem", fontSize: "3rem" }}>
        {fallback.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <div style={{ borderRadius: 12, overflow: "hidden", height: 360, background: "var(--bg-2)", border: "1px solid var(--border-0)" }}>
        <img src={images[active].url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      </div>
      {images.length > 1 && (
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.6rem", overflowX: "auto" }}>
          {images.map((im, i) => (
            <button
              key={im.id}
              onClick={() => setActive(i)}
              style={{
                width: 64, height: 64, borderRadius: 8, overflow: "hidden",
                border: i === active ? "2px solid var(--accent)" : "1px solid var(--border-0)",
                cursor: "pointer", background: "transparent", flexShrink: 0, padding: 0,
              }}
            >
              <img src={im.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

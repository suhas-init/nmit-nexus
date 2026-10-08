"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Lightbox } from "@/components/lightbox";
import { Expand, ZoomIn } from "lucide-react";

type Img = { id: string; url: string; sort_order: number };

export function ListingGallery({ listingId, fallback }: { listingId: string; fallback: string }) {
  const [images, setImages] = useState<Img[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);

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
    <>
      <div style={{ marginBottom: "1.25rem" }}>
        {/* Main image — click to expand */}
        <button
          onClick={() => setLightboxOpen(true)}
          className="group"
          style={{
            display: "block", width: "100%", padding: 0,
            borderRadius: 12, overflow: "hidden",
            height: "clamp(220px, 45vw, 420px)",
            background: "var(--bg-2)",
            border: "1px solid var(--border-0)",
            cursor: "zoom-in", position: "relative",
            transition: "border-color 0.2s",
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--border-2)"}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border-0)"}
        >
          <img
            key={images[active].id}
            src={images[active].url}
            alt=""
            style={{
              width: "100%", height: "100%", objectFit: "contain",
              animation: "galFade 0.35s cubic-bezier(0.2, 0.9, 0.3, 1)",
            }}
          />
          {/* Expand hint */}
          <span style={{
            position: "absolute", top: 12, right: 12,
            background: "rgba(0,0,0,0.6)", color: "white",
            borderRadius: 6, padding: "0.3rem 0.55rem",
            display: "inline-flex", alignItems: "center", gap: "0.3rem",
            fontFamily: "var(--font-mono)", fontSize: "0.62rem", letterSpacing: "0.1em",
            opacity: 0, transition: "opacity 0.2s",
            pointerEvents: "none",
          }} className="expand-hint">
            <Expand size={11} /> EXPAND
          </span>
        </button>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.6rem", overflowX: "auto", paddingBottom: "0.25rem" }}>
            {images.map((im, i) => (
              <button
                key={im.id}
                onClick={() => setActive(i)}
                style={{
                  width: 64, height: 64, borderRadius: 8, overflow: "hidden",
                  border: i === active ? "2px solid var(--accent)" : "1px solid var(--border-0)",
                  cursor: "pointer", background: "transparent", flexShrink: 0, padding: 0,
                  transition: "border-color 0.15s, transform 0.15s",
                  transform: i === active ? "translateY(-2px)" : "none",
                  opacity: i === active ? 1 : 0.7,
                }}
              >
                <img src={im.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hover reveal for expand hint — needs a style tag once */}
      <style>{`
        @keyframes galFade { from { opacity: 0.6; transform: scale(0.995); } to { opacity: 1; transform: scale(1); } }
        button:hover .expand-hint { opacity: 1 !important; }
      `}</style>

      {lightboxOpen && (
        <Lightbox
          images={images.map((im) => ({ id: im.id, url: im.url }))}
          startIndex={active}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}

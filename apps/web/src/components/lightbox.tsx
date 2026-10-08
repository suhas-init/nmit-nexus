"use client";
import { useEffect, useState, useRef } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";

export type LightboxImage = { id: string; url: string };

export function Lightbox({
  images,
  startIndex = 0,
  onClose,
}: {
  images: LightboxImage[];
  startIndex?: number;
  onClose: () => void;
}) {
  const [i, setI] = useState(startIndex);
  const [zoom, setZoom] = useState(1);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const touchStart = useRef<{ x: number; y: number; t: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(z + 0.5, 4));
      if (e.key === "-") setZoom((z) => Math.max(z - 0.5, 1));
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, []);

  const next = () => { setI((p) => (p + 1) % images.length); setZoom(1); };
  const prev = () => { setI((p) => (p - 1 + images.length) % images.length); setZoom(1); };

  // Touch swipe
  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    const dt = Date.now() - touchStart.current.t;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) && dt < 600) {
      if (dx < 0) next(); else prev();
    }
    touchStart.current = null;
  };

  // Mouse pan when zoomed
  const onMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setDrag({ x: e.clientX, y: e.clientY });
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!drag || zoom <= 1 || !containerRef.current) return;
    const img = containerRef.current.querySelector("img") as HTMLImageElement | null;
    if (!img) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    img.style.transform = `translate(${dx}px, ${dy}px) scale(${zoom})`;
  };
  const onMouseUp = () => setDrag(null);

  return (
    <div
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0, zIndex: 400,
        background: "rgba(8, 9, 11, 0.94)",
        backdropFilter: "blur(12px)",
        display: "flex", flexDirection: "column",
        animation: "lbFadeIn 0.25s cubic-bezier(0.2, 0.9, 0.3, 1)",
      }}
    >
      <style>{`
        @keyframes lbFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes lbSlide { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        @keyframes lbThumb { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0.85rem 1rem", color: "white", zIndex: 2,
      }}>
        <div className="mono" style={{ fontSize: "0.78rem", letterSpacing: "0.14em", opacity: 0.8 }}>
          {i + 1} / {images.length}
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button onClick={() => setZoom((z) => Math.max(z - 0.5, 1))} disabled={zoom <= 1}
            style={btnStyle} title="Zoom out"><ZoomOut size={16} /></button>
          <button onClick={() => setZoom((z) => Math.min(z + 0.5, 4))} disabled={zoom >= 4}
            style={btnStyle} title="Zoom in"><ZoomIn size={16} /></button>
          <button onClick={onClose} style={btnStyle} title="Close"><X size={18} /></button>
        </div>
      </div>

      {/* Main image */}
      <div
        ref={containerRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{
          flex: 1, display: "grid", placeItems: "center", padding: "0 1rem",
          overflow: "hidden", position: "relative",
          cursor: zoom > 1 ? (drag ? "grabbing" : "grab") : "default",
          touchAction: "none",
        }}
      >
        <img
          key={images[i].id}
          src={images[i].url}
          alt=""
          draggable={false}
          style={{
            maxWidth: "100%", maxHeight: "100%",
            objectFit: "contain",
            transform: `scale(${zoom})`,
            transition: drag ? "none" : "transform 0.3s cubic-bezier(0.2, 0.9, 0.3, 1)",
            animation: "lbSlide 0.3s cubic-bezier(0.2, 0.9, 0.3, 1)",
            userSelect: "none",
          }}
        />

        {/* Arrows — only if multiple images */}
        {images.length > 1 && (
          <>
            <button onClick={prev} style={{ ...arrowStyle, left: 8 }} title="Previous">
              <ChevronLeft size={26} />
            </button>
            <button onClick={next} style={{ ...arrowStyle, right: 8 }} title="Next">
              <ChevronRight size={26} />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div style={{
          display: "flex", gap: "0.5rem", padding: "0.75rem 1rem 1rem",
          justifyContent: "center", overflowX: "auto",
        }}>
          {images.map((im, idx) => (
            <button
              key={im.id}
              onClick={() => { setI(idx); setZoom(1); }}
              style={{
                width: 56, height: 56, borderRadius: 6, overflow: "hidden",
                border: idx === i ? "2px solid var(--accent)" : "1px solid rgba(255,255,255,0.15)",
                background: "transparent", cursor: "pointer", padding: 0, flexShrink: 0,
                opacity: idx === i ? 1 : 0.55,
                transition: "opacity 0.2s, border-color 0.2s",
                animation: `lbThumb 0.3s cubic-bezier(0.2, 0.9, 0.3, 1) ${idx * 0.04}s backwards`,
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

const btnStyle: React.CSSProperties = {
  width: 34, height: 34, borderRadius: 6,
  background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
  color: "white", cursor: "pointer", display: "grid", placeItems: "center",
  transition: "background 0.15s",
};

const arrowStyle: React.CSSProperties = {
  position: "absolute", top: "50%", transform: "translateY(-50%)",
  width: 44, height: 44, borderRadius: "50%",
  background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.15)",
  color: "white", cursor: "pointer", display: "grid", placeItems: "center",
  transition: "background 0.15s",
  zIndex: 2,
};

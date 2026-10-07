export function GridBg() {
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -1,
        pointerEvents: "none",
        background:
          "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(242,183,5,0.06) 0%, transparent 55%), var(--bg-0)",
      }}
    />
  );
}

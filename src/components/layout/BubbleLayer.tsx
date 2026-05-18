// Pure layout component — no hooks, no "use client" needed.
// Renders floating bubble particles that rise across the full viewport.
// Placed in RootLayout so every page gets the effect.

const BUBBLES = [
  { size: 14, left: "3%",  delay: "0s",    dur: "16s" },
  { size: 22, left: "8%",  delay: "6s",    dur: "20s" },
  { size: 10, left: "14%", delay: "2s",    dur: "14s" },
  { size: 18, left: "20%", delay: "9s",    dur: "18s" },
  { size: 12, left: "27%", delay: "1s",    dur: "15s" },
  { size: 26, left: "34%", delay: "7s",    dur: "22s" },
  { size: 16, left: "41%", delay: "4s",    dur: "17s" },
  { size: 20, left: "48%", delay: "11s",   dur: "19s" },
  { size: 12, left: "55%", delay: "3s",    dur: "15s" },
  { size: 24, left: "62%", delay: "8s",    dur: "21s" },
  { size: 14, left: "69%", delay: "0.5s",  dur: "16s" },
  { size: 18, left: "76%", delay: "5s",    dur: "18s" },
  { size: 10, left: "82%", delay: "13s",   dur: "14s" },
  { size: 22, left: "88%", delay: "2.5s",  dur: "20s" },
  { size: 16, left: "94%", delay: "10s",   dur: "17s" },
];

export default function BubbleLayer() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {BUBBLES.map((b, i) => (
        <span
          key={i}
          className="bubble"
          style={{
            width:             b.size,
            height:            b.size,
            left:              b.left,
            animationDelay:    b.delay,
            animationDuration: b.dur,
          }}
        />
      ))}
    </div>
  );
}

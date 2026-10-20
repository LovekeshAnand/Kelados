"use client";
// The action wheel. A frosted ring of four segments (Share, Convert, Format, Listen) around a centre disc; pointing at a
// segment unfolds its options as an outer band of the same glass, divided into cells. No fills: the active segment and
// the option under the pointer are marked by colour and a thin arc on the rim. A segment stays open until you point at
// another one, so the pointer can travel out to the band. Real focusable controls: Tab, Enter and Esc work.
import { useEffect, useState } from "react";
import { SEGMENTS, type Action, type ActionResult, type Segment } from "@/lib/textActions";

const R = { disc: 40, in: 48, out: 116, bandIn: 122, bandOut: 180 }; // px
const MID: Record<Segment["id"], number> = { share: -90, convert: 0, format: 90, listen: 180 }; // degrees, clockwise from 3 o'clock
const CELL = 36; // degrees per option cell
const rad = (d: number) => (d * Math.PI) / 180;
const pt = (r: number, d: number) => [r * Math.cos(rad(d)), r * Math.sin(rad(d))];

function sector(r0: number, r1: number, a0: number, a1: number, cx = 0, cy = 0) {
  const p = (r: number, d: number) => pt(r, d).map((v, i) => v + (i ? cy : cx)).join(" ");
  const big = a1 - a0 > 180 ? 1 : 0;
  return `M${p(r1, a0)} A${r1} ${r1} 0 ${big} 1 ${p(r1, a1)} L${p(r0, a1)} A${r0} ${r0} 0 ${big} 0 ${p(r0, a0)}Z`;
}
function arc(r: number, a0: number, a1: number) {
  const [x0, y0] = pt(r, a0), [x1, y1] = pt(r, a1);
  return `M${x0} ${y0} A${r} ${r} 0 0 1 ${x1} ${y1}`;
}

const ICON: Record<string, string> = {
  share: "M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13",
  convert: "M4 8h13l-3-3M20 16H7l3 3",
  format: "M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01",
  listen: "M11 5 6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13",
  "share.email": "M3 6h18v12H3zM3 7l9 6 9-6",
  "share.whatsapp": "M20 12a8 8 0 0 1-11.7 7.1L4 20l1-4.1A8 8 0 1 1 20 12z",
  "share.copy": "M9 9h11v11H9zM5 15H4V4h11v1",
  "convert.pdf": "M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h4",
  "convert.jpg": "M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15.5 9h.01",
  "convert.word": "M6 3h9l4 4v14H6zM14 3v5h5M8.5 12l1.5 5 2-4 2 4 1.5-5",
  "convert.txt": "M5 6h14M12 6v13M9 19h6",
  "format.bullets": "M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01",
  "format.numbered": "M10 6h10M10 12h10M10 18h10M4 5h1v4M4 9h2M4 14.5c.5-.7 2-.7 2 .2 0 .8-2 1.6-2 2.3h2",
  "format.paragraph": "M4 6h16M4 10h16M4 14h16M4 18h10",
  "format.email": "M3 6h18v12H3zM3 7l9 6 9-6",
  "format.refine": "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z",
  "listen.read": "M8 5v14l11-7z",
  "listen.audio": "M12 4v11M7 10l5 5 5-5M5 20h14",
};
const Icon = ({ id, size }: { id: string; size: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={ICON[id]} />
  </svg>
);

export function RadialMenu({ text, at, onResult, onClose }: {
  text: string; at: { x: number; y: number }; onResult: (r: ActionResult) => void; onClose: () => void;
}) {
  const [active, setActive] = useState<Segment["id"] | null>(null);
  const [hover, setHover] = useState(""); // option under the pointer or focus
  const [busy, setBusy] = useState("");
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);

  const run = async (a: Action) => {
    setBusy(a.id);
    try { onResult(await a.run(text)); onClose(); }
    catch (e) { onResult({ message: `Couldn't ${a.label.toLowerCase()}: ${(e as Error).message}` }); setBusy(""); }
  };
  const open = (id: Segment["id"]) => { setActive(id); setHover(""); };

  // Fit inside the window (the sticky note is small) and keep it on screen.
  const reach = R.bandOut + 8;
  const scale = Math.min(1, (Math.min(window.innerWidth, window.innerHeight) - 12) / (reach * 2));
  const half = reach * scale;
  const x = Math.min(Math.max(at.x, half), window.innerWidth - half);
  const y = Math.min(Math.max(at.y, half), window.innerHeight - half);
  const seg = SEGMENTS.find((s) => s.id === active);
  const n = seg?.actions.length ?? 0;
  const b0 = seg ? MID[seg.id] - (n * CELL) / 2 : 0, b1 = b0 + n * CELL; // the band's start and end angles
  const label = seg?.actions.find((a) => a.id === hover)?.label;

  return (
    <div className="fixed inset-0 z-50 bg-bg/35 backdrop-blur-[2px]" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="menu" aria-label="Actions" className="absolute" style={{ left: x, top: y, transform: `scale(${scale})` }}>
        <div style={{ animation: "kel-wheel-in 360ms cubic-bezier(.22,1.2,.36,1) both" }}>
          {/* Glass: the ring, and the band for the open segment, cut from the same frosted material. */}
          <div className="glass absolute rounded-full" style={{ left: -R.out, top: -R.out, width: R.out * 2, height: R.out * 2,
            maskImage: `radial-gradient(circle, transparent ${R.in - 0.5}px, #000 ${R.in}px)`, WebkitMaskImage: `radial-gradient(circle, transparent ${R.in - 0.5}px, #000 ${R.in}px)` }} />
          {seg && (
            <div key={seg.id} className="glass absolute" style={{ left: -R.bandOut, top: -R.bandOut, width: R.bandOut * 2, height: R.bandOut * 2, border: 0, boxShadow: "none",
              clipPath: `path("${sector(R.bandIn, R.bandOut, b0, b1, R.bandOut, R.bandOut)}")`, animation: "kel-band-in 260ms cubic-bezier(.22,1.2,.36,1) both" }} />
          )}

          <svg className="pointer-events-none absolute overflow-visible" width={1} height={1} aria-hidden>
            {[45, 135, 225, 315].map((d) => { // hairlines between ring segments
              const [x0, y0] = pt(R.in + 10, d), [x1, y1] = pt(R.out - 10, d);
              return <line key={d} x1={x0} y1={y0} x2={x1} y2={y1} stroke="var(--glass-line)" strokeWidth={1} />;
            })}
            {seg && <path d={arc(R.out - 5, MID[seg.id] - 34, MID[seg.id] + 34)} stroke="var(--color-accent)" strokeWidth={3} strokeLinecap="round" fill="none" />}
            {seg && (
              <g key={seg.id} style={{ animation: "kel-band-in 260ms cubic-bezier(.22,1.2,.36,1) both" }}>
                <path d={sector(R.bandIn, R.bandOut, b0, b1)} fill="none" stroke="var(--glass-line)" strokeWidth={1} />
                {Array.from({ length: n - 1 }, (_, i) => {
                  const d = b0 + (i + 1) * CELL, [x0, y0] = pt(R.bandIn + 10, d), [x1, y1] = pt(R.bandOut - 10, d);
                  return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke="var(--glass-line)" strokeWidth={1} />;
                })}
                {seg.actions.map((a, i) => a.id === hover && (
                  <path key={a.id} d={arc(R.bandOut - 5, b0 + i * CELL + 7, b0 + (i + 1) * CELL - 7)} stroke="var(--color-accent)" strokeWidth={3} strokeLinecap="round" fill="none" />
                ))}
              </g>
            )}
          </svg>

          {/* Hit areas: each whole wedge and each whole cell, so there are no dead spots on the way out. */}
          <svg className="absolute overflow-visible" width={1} height={1} aria-hidden>
            {SEGMENTS.map((s) => (
              <path key={s.id} d={sector(R.in, R.out, MID[s.id] - 45, MID[s.id] + 45)} fill="transparent" className="cursor-pointer"
                onMouseEnter={() => open(s.id)} onClick={() => open(s.id)} />
            ))}
            {seg && seg.actions.map((a, i) => (
              <path key={a.id} d={sector(R.bandIn - 6, R.bandOut, b0 + i * CELL, b0 + (i + 1) * CELL)} fill="transparent" className="cursor-pointer"
                onMouseEnter={() => setHover(a.id)} onMouseLeave={() => setHover((h) => (h === a.id ? "" : h))} onClick={() => run(a)} />
            ))}
          </svg>

          {SEGMENTS.map((s) => {
            const [sx, sy] = pt((R.in + R.out) / 2, MID[s.id]);
            const on = active === s.id;
            return (
              <button key={s.id} role="menuitem" aria-haspopup="true" aria-expanded={on} onFocus={() => open(s.id)} onClick={() => open(s.id)}
                className={`pointer-events-none absolute flex w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 text-[12px] font-semibold outline-none transition-colors focus-visible:underline ${on ? "text-accent" : "text-fg/75"}`}
                style={{ left: sx, top: sy }}>
                <Icon id={s.id} size={19} />
                {s.label}
              </button>
            );
          })}

          {seg && seg.actions.map((a, i) => {
            const [cx, cy] = pt((R.bandIn + R.bandOut) / 2, b0 + (i + 0.5) * CELL);
            return (
              <button key={`${seg.id}.${a.id}`} role="menuitem" onFocus={() => setHover(a.id)} onBlur={() => setHover("")} onClick={() => run(a)}
                className={`pointer-events-none absolute flex w-[76px] flex-col items-center gap-1 text-[11px] font-semibold leading-tight outline-none transition-colors ${hover === a.id ? "text-accent" : "text-fg/80"}`}
                style={{ left: cx, top: cy, animation: `kel-pop 300ms cubic-bezier(.22,1.3,.36,1) ${60 + i * 35}ms both` }}>
                {busy === a.id ? <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" /> : <Icon id={`${seg.id}.${a.id}`} size={17} />}
                {a.label}
              </button>
            );
          })}

          {/* Centre: names what you're pointing at; click or Esc closes. */}
          <button role="menuitem" aria-label="Close" onClick={onClose}
            className="glass absolute grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            style={{ left: 0, top: 0, width: R.disc * 2, height: R.disc * 2 }}>
            <span className="max-w-[64px] text-center text-[11px] font-semibold leading-tight text-muted">{label ?? seg?.label ?? "Close"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

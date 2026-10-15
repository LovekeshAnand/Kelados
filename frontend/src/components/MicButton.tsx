"use client";
import type { DictationStatus } from "@/lib/speech/useDictation";

/** Round talk button ringed by dots that swell with your voice. */
export function MicButton({ status, level, onClick, size = 112 }: { status: DictationStatus; level: number; onClick: () => void; size?: number }) {
  const on = status === "listening";
  const ring = 24;
  const boost = on ? Math.min(1, Math.sqrt(level) * 5) : 0;
  return (
    <button onClick={onClick} disabled={status === "starting" || status === "finishing"} aria-pressed={on}
      aria-label={on ? "Stop dictation" : "Start dictation"}
      className="group relative grid shrink-0 place-items-center disabled:opacity-60" style={{ width: size, height: size }}>
      {Array.from({ length: ring }, (_, i) => {
        const a = (i / ring) * Math.PI * 2;
        const r = size / 2 - 4 + boost * 6 * (0.6 + 0.4 * Math.sin(i * 1.7));
        return (
          <span key={i} className={`absolute size-1.5 rounded-full transition-all duration-100 ${on ? "bg-accent" : "bg-line-strong group-hover:bg-accent/60"}`}
            // Rounded so the static HTML and the browser agree to the last digit (no hydration mismatch).
            style={{ left: Math.round((size / 2 + Math.cos(a) * r - 3) * 10) / 10, top: Math.round((size / 2 + Math.sin(a) * r - 3) * 10) / 10 }} />
        );
      })}
      <span className={`grid place-items-center rounded-full transition-colors ${on ? "bg-accent text-bg" : "bg-accent-soft text-accent group-hover:bg-accent/20"}`}
        style={{ width: size * 0.62, height: size * 0.62 }}>
        {on
          ? <span className="size-5 rounded-sm bg-bg" />
          : <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 4a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V7a3 3 0 0 1 3-3zM6 11a6 6 0 0 0 12 0M12 17v3" /></svg>}
      </span>
    </button>
  );
}

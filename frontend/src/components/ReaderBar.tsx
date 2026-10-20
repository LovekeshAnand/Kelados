"use client";
// Shown while Kelados reads aloud: the sentence being spoken, how far along it is, and Stop.
import { useEngine } from "@/lib/engine/tts";
import { stopReading, useReading } from "@/lib/reader";

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function ReaderBar({ className = "" }: { className?: string }) {
  const r = useReading();
  const engine = useEngine();
  if (r.status === "idle") return null;
  const preparing = r.status === "preparing";
  const loadingModel = preparing && engine.status === "loading";
  const pct = preparing ? (loadingModel ? engine.progress * 100 : 0) : Math.min(100, (r.elapsed / Math.max(r.total, 0.1)) * 100);

  return (
    <div role="status" aria-live="polite" className={`glass flex items-center gap-3 rounded-2xl px-3 py-2.5 ${className}`}>
      <button onClick={stopReading} aria-label="Stop reading"
        className="grid size-8 shrink-0 place-items-center rounded-full bg-fg text-bg transition-transform hover:scale-105">
        <span className="size-2.5 rounded-[2px] bg-current" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-fg">
          {preparing ? (loadingModel ? `Preparing the voice · ${Math.round(engine.progress * 100)}%` : "Preparing the voice…") : r.sentence}
        </p>
        <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-line">
          <div className={`h-full rounded-full bg-accent ${r.status === "buffering" ? "animate-pulse" : ""}`} style={{ width: `${pct}%`, transition: "width 120ms linear" }} />
        </div>
      </div>
      <span className="shrink-0 text-[11px] font-semibold tabular-nums text-subtle">
        {preparing ? "" : r.status === "buffering" ? "Buffering" : `${clock(r.elapsed)} / ${clock(r.total)}`}
      </span>
    </div>
  );
}

"use client";
import { SttStatus } from "./SttStatus";
import { LevelDots } from "./ui";
import type { DictationStatus } from "@/lib/speech/useDictation";

/** Compact dictation readout for overlays and side panels. */
export function DictationPill({ status, level, partial, last, error, hint, label }: {
  status: DictationStatus; level: number; partial: string; last: string; error: string; hint?: string; label?: string;
}) {
  const on = status === "listening";
  return (
    <div role="status" aria-live="polite" className="rounded-xl border border-line bg-surface/95 px-4 py-3 shadow-lg shadow-black/30 backdrop-blur">
      <div className="flex items-center gap-2.5 text-[13px]">
        <span className={`size-2 rounded-full ${on ? "animate-pulse-dot bg-accent-strong" : "bg-line-strong"}`} />
        <span className="font-medium text-fg">{label ?? (on ? "Listening" : status === "starting" ? "Starting microphone" : status === "finishing" ? "Finishing" : "Paused")}</span>
        <span className="ml-auto"><LevelDots level={level} active={on} /></span>
      </div>
      <p className="mt-1.5 line-clamp-2 min-h-[2.5em] text-sm leading-snug">
        {partial ? <span className="text-muted">{partial}</span> : last ? <span className="text-fg">{last}</span> : <span className="text-subtle">{hint}</span>}
      </p>
      {error ? <p className="text-xs text-danger">{error}</p> : <SttStatus />}
    </div>
  );
}

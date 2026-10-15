"use client";
import { SttStatus } from "./SttStatus";
import { LevelDots } from "./ui";
import type { DictationStatus } from "@/lib/speech/useDictation";

/** Compact dictation readout for overlays and side panels. */
export function DictationPill({ status, level, partial, last, error, hint }: {
  status: DictationStatus; level: number; partial: string; last: string; error: string; hint?: string;
}) {
  const on = status === "listening";
  return (
    <div className="space-y-2 rounded-md border border-accent/30 bg-bg/95 p-3 shadow-2xl shadow-black">
      <div className="flex items-center gap-3">
        <span className={`size-2.5 rounded-full ${on ? "animate-pulse-dot bg-accent-strong" : "bg-line-strong"}`} />
        <span className="label text-sm">{on ? "Listening" : status === "starting" ? "Starting mic" : status === "finishing" ? "Finishing" : "Paused"}</span>
        <span className="ml-auto"><LevelDots level={level} active={on} /></span>
      </div>
      <p className="line-clamp-2 min-h-[2.5em] text-sm leading-snug">
        {partial ? <span className="italic text-muted">{partial}…</span> : last ? <span className="text-fg">{last}</span> : <span className="text-subtle">{hint}</span>}
      </p>
      {error ? <p className="text-xs text-danger">{error}</p> : <SttStatus />}
    </div>
  );
}

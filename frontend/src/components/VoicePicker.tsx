"use client";
import { useMemo, useRef, useState } from "react";
import { VOICES, voiceById, type Voice } from "@/lib/voices";
import { synthesize } from "@/lib/tts";
import { concatAudio } from "@/lib/audio";
import { btn, Spinner } from "./ui";

let previewCtx: AudioContext | null = null;
const previewCache = new Map<string, AudioBuffer>();

/** Speak a short sample in a voice; cached per voice for the session. */
export async function previewVoice(v: Voice) {
  previewCtx ??= new AudioContext();
  let buf = previewCache.get(v.id);
  if (!buf) {
    const chunks = await synthesize(`Hi, I'm ${v.name}. ${v.vibe}.`, { voice: v.id, speed: 1 });
    const rate = chunks[0]?.sampleRate ?? 24000;
    const data = concatAudio(chunks, rate);
    buf = previewCtx.createBuffer(1, data.length, rate);
    buf.copyToChannel(data, 0);
    previewCache.set(v.id, buf);
  }
  const src = previewCtx.createBufferSource();
  src.buffer = buf;
  src.connect(previewCtx.destination);
  src.start();
}

export function VoiceAvatar({ v, size = "md" }: { v: Voice; size?: "sm" | "md" }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-full font-semibold text-bg ${size === "sm" ? "size-7 text-xs" : "size-9 text-sm"}`}
      style={{ background: v.color }}>
      {v.name[0]}
    </span>
  );
}

export function VoicePicker({ value, onChange, label = "Voice" }: { value: string; onChange: (id: string) => void; label?: string }) {
  const dlg = useRef<HTMLDialogElement>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"All" | "Female" | "Male" | "American" | "British">("All");
  const [previewing, setPreviewing] = useState<string | null>(null);
  const v = voiceById(value);

  const list = useMemo(() => VOICES.filter((x) =>
    (filter === "All" || x.gender === filter || x.accent === filter) &&
    (x.name + x.vibe).toLowerCase().includes(q.toLowerCase())), [q, filter]);

  const preview = async (x: Voice) => {
    setPreviewing(x.id);
    try { await previewVoice(x); } finally { setPreviewing(null); }
  };

  return (
    <>
      <button type="button" onClick={() => dlg.current?.showModal()}
        className="flex w-full items-center gap-3 rounded-lg border border-line bg-bg p-2 pr-3 text-left transition-colors hover:border-line-strong">
        <VoiceAvatar v={v} />
        <span className="min-w-0 flex-1">
          <span className="block text-xs text-subtle">{label}</span>
          <span className="block truncate text-sm font-medium">{v.name} <span className="font-normal text-muted">· {v.accent} {v.gender.toLowerCase()}</span></span>
        </span>
        <svg viewBox="0 0 20 20" className="size-4 text-muted" fill="currentColor" aria-hidden><path d="M5.5 7.5 10 12l4.5-4.5" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>
      </button>

      <dialog ref={dlg} onClick={(e) => e.target === dlg.current && dlg.current?.close()}
        className="m-auto w-[min(48rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-0 text-fg shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm">
        <div className="space-y-3 border-b border-line p-5">
          <div className="flex items-center gap-3">
            <h2 className="mr-auto text-lg font-semibold">Choose a voice</h2>
            <button className={btn("ghost", "sm")} onClick={() => dlg.current?.close()}>Close</button>
          </div>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search voices" autoFocus
            className="w-full rounded-lg border border-line bg-bg px-3.5 py-2 text-sm focus:border-line-strong focus:outline-none" />
          <div className="flex flex-wrap gap-1.5">
            {(["All", "Female", "Male", "American", "British"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${filter === f ? "border-fg bg-fg text-bg" : "border-line text-muted hover:text-fg"}`}>{f}</button>
            ))}
          </div>
        </div>
        <div className="grid max-h-[60vh] gap-2 overflow-y-auto p-4 sm:grid-cols-2">
          {list.map((x) => (
            <div key={x.id} className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${x.id === value ? "border-accent/50 bg-accent-soft" : "border-line hover:border-line-strong"}`}>
              <VoiceAvatar v={x} />
              <button className="min-w-0 flex-1 text-left" onClick={() => { onChange(x.id); dlg.current?.close(); }}>
                <span className="flex items-center gap-2 text-sm font-medium">
                  {x.name}
                  <span className="text-xs font-normal text-subtle">{x.accent === "American" ? "US" : "UK"} · {x.gender} · {x.grade}</span>
                </span>
                <span className="block truncate text-xs text-muted">{x.vibe}</span>
              </button>
              <button onClick={() => preview(x)} disabled={!!previewing} aria-label={`Preview ${x.name}`}
                className="grid size-8 shrink-0 place-items-center rounded-full border border-line text-muted transition-colors hover:border-line-strong hover:text-fg disabled:opacity-40">
                {previewing === x.id ? <Spinner /> : <svg viewBox="0 0 24 24" className="size-3.5 translate-x-px" fill="currentColor"><path d="M6 4l14 8-14 8z" /></svg>}
              </button>
            </div>
          ))}
          {!list.length && <p className="col-span-full py-10 text-center text-sm text-muted">No voices match.</p>}
        </div>
      </dialog>
    </>
  );
}

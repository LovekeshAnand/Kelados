"use client";
import { useState } from "react";
import { synthesize, useEngine } from "@/lib/tts";
import { concatAudio, encodeWav } from "@/lib/audio";
import { VOICES } from "@/lib/voices";
import { Player } from "./Player";
import { btn, Spinner } from "./ui";

const PICKS = ["af_heart", "bm_george", "am_fenrir", "af_bella", "bf_emma"];

export function HeroDemo() {
  const engine = useEngine();
  const [text, setText] = useState("Hello! I'm running entirely inside your browser, and I will never send you a bill.");
  const [voice, setVoice] = useState(PICKS[0]);
  const [busy, setBusy] = useState(false);
  const [clip, setClip] = useState<{ blob: Blob; samples: Float32Array } | null>(null);
  const [error, setError] = useState("");

  const speak = async () => {
    setBusy(true); setError("");
    try {
      const chunks = await synthesize(text.slice(0, 300), { voice, speed: 1 });
      const samples = concatAudio(chunks, 24000);
      setClip({ samples, blob: encodeWav(samples, 24000) });
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  const color = VOICES.find((v) => v.id === voice)!.color;
  return (
    <div className="rounded-2xl border border-line bg-surface p-2 shadow-2xl shadow-black/50">
      <div className="flex items-center gap-1.5 px-3 py-2">
        <span className="size-2.5 rounded-full bg-line-strong" /><span className="size-2.5 rounded-full bg-line-strong" /><span className="size-2.5 rounded-full bg-line-strong" />
        <span className="ml-3 text-xs text-subtle">Live demo · runs on your device</span>
      </div>
      <div className="rounded-xl border border-line bg-bg p-4">
        <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={300} rows={3} aria-label="Demo text"
          className="w-full resize-none bg-transparent text-[15px] leading-relaxed focus:outline-none" />
        <div className="mt-3 flex flex-wrap gap-1.5">
          {PICKS.map((id) => {
            const v = VOICES.find((x) => x.id === id)!;
            return (
              <button key={id} onClick={() => setVoice(id)} aria-pressed={voice === id}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${voice === id ? "border-line-strong bg-elevated text-fg" : "border-line text-muted hover:text-fg"}`}>
                <span className="size-2 rounded-full" style={{ background: v.color }} />{v.name}
              </button>
            );
          })}
        </div>
      </div>
      <div className="p-2">
        <button onClick={speak} disabled={busy || !text.trim()} className={`${btn("primary", "md")} w-full`}>
          {busy ? <><Spinner /> {engine.status === "loading" ? `Loading model · ${Math.round(engine.progress * 100)}%` : "Generating…"}</> : "Generate speech"}
        </button>
        {engine.status !== "ready" && !busy && <p className="mt-2 text-center text-xs text-subtle">The first run downloads the model once (~90 MB+)</p>}
        {error && <p className="mt-2 text-xs text-danger">{error}</p>}
        {clip && <div className="mt-3"><Player blob={clip.blob} samples={clip.samples} color={color} autoPlay /></div>}
      </div>
    </div>
  );
}

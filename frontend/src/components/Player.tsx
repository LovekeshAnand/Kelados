"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { fmtTime } from "@/lib/audio";

const BARS = 120;

function peaksOf(samples: Float32Array, bars = BARS) {
  const step = Math.max(1, Math.floor(samples.length / bars));
  const out: number[] = [];
  for (let i = 0; i < bars; i++) {
    let max = 0;
    for (let j = i * step; j < Math.min((i + 1) * step, samples.length); j++) max = Math.max(max, Math.abs(samples[j]));
    out.push(max);
  }
  const top = Math.max(...out, 0.01);
  return out.map((v) => v / top);
}

/** Waveform audio player. Pass `samples` when you have them; otherwise the blob is decoded for the waveform. */
export function Player({ blob, samples, color = "#f2b45a", autoPlay = false, compact = false }: {
  blob: Blob; samples?: Float32Array; color?: string; autoPlay?: boolean; compact?: boolean;
}) {
  const url = useMemo(() => URL.createObjectURL(blob), [blob]);
  const audio = useRef<HTMLAudioElement>(null);
  const [decoded, setDecoded] = useState<number[]>([]);
  const given = useMemo(() => (samples ? peaksOf(samples, compact ? 60 : BARS) : null), [samples, compact]);
  const peaks = given ?? decoded;
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  useEffect(() => {
    if (samples) return;
    let live = true;
    (async () => {
      const ctx = new AudioContext();
      try {
        const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
        if (live) setDecoded(peaksOf(buf.getChannelData(0), compact ? 60 : BARS));
      } catch { /* undecodable: leave flat */ } finally { ctx.close(); }
    })();
    return () => { live = false; };
  }, [blob, samples, compact]);

  const toggle = () => {
    const a = audio.current!;
    if (a.paused) a.play(); else a.pause();
  };
  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audio.current!;
    const r = e.currentTarget.getBoundingClientRect();
    if (a.duration) a.currentTime = ((e.clientX - r.left) / r.width) * a.duration;
  };
  const pct = dur ? t / dur : 0;

  return (
    <div className={`flex items-center gap-3 ${compact ? "" : "rounded-xl border border-line bg-bg p-3"}`}>
      <audio ref={audio} src={url} autoPlay={autoPlay} preload="metadata"
        onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
      <button onClick={toggle} aria-label={playing ? "Pause" : "Play"}
        style={{ background: color }}
        className={`grid shrink-0 place-items-center rounded-full text-bg transition hover:brightness-110 ${compact ? "size-8" : "size-11"}`}>
        {playing
          ? <svg viewBox="0 0 24 24" className="size-4"><path d="M6 4h4v16H6zM14 4h4v16h-4z" fill="currentColor" /></svg>
          : <svg viewBox="0 0 24 24" className="size-4 translate-x-px"><path d="M6 4l14 8-14 8z" fill="currentColor" /></svg>}
      </button>
      <div className={`flex flex-1 cursor-pointer items-center gap-[2px] ${compact ? "h-7" : "h-12"}`} onClick={seek} role="slider"
        aria-label="Seek" aria-valuemin={0} aria-valuemax={Math.round(dur)} aria-valuenow={Math.round(t)} tabIndex={0}
        onKeyDown={(e) => { const a = audio.current!; if (e.key === "ArrowRight") a.currentTime += 5; if (e.key === "ArrowLeft") a.currentTime -= 5; }}>
        {(peaks.length ? peaks : Array(compact ? 60 : BARS).fill(0.05)).map((p, i, arr) => (
          <span key={i} className="flex-1 rounded-full transition-colors"
            style={{ height: `${Math.max(6, p * 100)}%`, background: i / arr.length <= pct ? color : "rgba(255,255,255,.12)" }} />
        ))}
      </div>
      <span className="w-20 shrink-0 text-right font-mono text-xs tabular-nums text-muted">{fmtTime(t)} / {fmtTime(dur)}</span>
    </div>
  );
}

"use client";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { synthesize } from "@/lib/tts";
import { applyLexicon, concatAudio, download, encodeWav, slug } from "@/lib/audio";
import { addHistory, clearHistory, deleteHistory, listHistory, type HistoryItem } from "@/lib/history";
import { reportUsage, useAuth } from "@/lib/api";
import { SAMPLE_LINES, VOICES, voiceById } from "@/lib/voices";
import { EngineStatus } from "@/components/EngineStatus";
import { VoicePicker } from "@/components/VoicePicker";
import { Player } from "@/components/Player";
import { btn, card, Spinner } from "@/components/ui";

const MAX = 50_000;
const SAMPLE_LABELS = ["Narration", "Podcast", "Audiobook", "News"];

function Studio() {
  const params = useSearchParams();
  const { user, presets, lexicon } = useAuth();
  const [text, setText] = useState(SAMPLE_LINES[0]);
  const [voice, setVoice] = useState(() => VOICES.some((v) => v.id === params.get("voice")) ? params.get("voice")! : "af_heart");
  const [speed, setSpeed] = useState(1);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ blob: Blob; samples: Float32Array; voice: string } | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const abort = useRef<AbortController | null>(null);
  const live = useRef<{ ctx: AudioContext; next: number; sources: AudioBufferSourceNode[] } | null>(null);

  const refresh = useCallback(() => listHistory().then(setHistory).catch(() => {}), []);
  useEffect(() => { refresh(); }, [refresh]);

  const stopLive = () => {
    live.current?.sources.forEach((s) => { try { s.stop(); } catch {} });
    live.current?.ctx.close();
    live.current = null;
  };

  const generate = async () => {
    const input = text.trim();
    if (!input || busy) return;
    setBusy(true); setError(""); setProgress(0); setResult(null);
    stopLive();
    const ctx = new AudioContext();
    live.current = { ctx, next: ctx.currentTime + 0.05, sources: [] };
    abort.current = new AbortController();
    let done = 0;
    try {
      const chunks = await synthesize(applyLexicon(input, lexicon), {
        voice, speed, signal: abort.current.signal,
        // Play each sentence as soon as it's ready, scheduled back-to-back.
        onChunk: (c) => {
          done += c.text.length;
          setProgress(Math.min(0.99, done / input.length));
          const l = live.current;
          if (!l || l.ctx !== ctx) return;
          const buf = ctx.createBuffer(1, c.audio.length, c.sampleRate);
          buf.copyToChannel(new Float32Array(c.audio), 0);
          const src = ctx.createBufferSource();
          src.buffer = buf;
          src.connect(ctx.destination);
          l.next = Math.max(l.next, ctx.currentTime);
          src.start(l.next);
          l.next += buf.duration;
          l.sources.push(src);
        },
      });
      if (!chunks.length) return;
      const rate = chunks[0].sampleRate;
      const samples = concatAudio(chunks, rate);
      const blob = encodeWav(samples, rate);
      const duration = samples.length / rate;
      setResult({ blob, samples, voice });
      setProgress(1);
      reportUsage(input.length, duration);
      await addHistory({ id: crypto.randomUUID(), text: input, voice, speed, duration, createdAt: Date.now(), blob });
      refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      abort.current = null;
    }
  };

  const stop = () => { abort.current?.abort(); stopLive(); };
  const v = voiceById(voice);

  return (
    <section className="mx-auto grid max-w-6xl gap-6 px-5 py-10 md:px-8 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Speech studio</h1>
          <p className="mt-1 text-sm text-muted">Unlimited text-to-speech, generated on your device. Audio starts playing while the rest is still generating.</p>
        </div>
        <EngineStatus />

        <div className={card}>
          <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, MAX))}
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") generate(); }}
            aria-label="Text to speak" placeholder="Type or paste anything…"
            className="min-h-80 w-full resize-y bg-transparent p-5 text-base leading-relaxed placeholder:text-subtle focus:outline-none" />
          <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
            {SAMPLE_LINES.map((s, i) => (
              <button key={i} onClick={() => setText(s)} className="rounded-full border border-line px-2.5 py-1 text-xs text-muted transition-colors hover:text-fg">
                {SAMPLE_LABELS[i]}
              </button>
            ))}
            <span className={`ml-auto text-xs tabular-nums ${text.length >= MAX ? "text-danger" : "text-subtle"}`}>{text.length.toLocaleString()} / {MAX.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {busy
            ? <button className={btn("secondary", "lg")} onClick={stop}><Spinner /> Stop</button>
            : <button className={btn("primary", "lg")} onClick={generate} disabled={!text.trim()}>Generate speech</button>}
          <span className="text-xs text-subtle">Ctrl / ⌘ + Enter</span>
          {busy && (
            <div className="h-1 min-w-40 flex-1 overflow-hidden rounded-full bg-line">
              <div className="h-full bg-accent transition-all" style={{ width: `${progress * 100}%` }} />
            </div>
          )}
        </div>

        {error && <p className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{error}</p>}

        {result && (
          <div className={`${card} space-y-3 p-4`}>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="font-medium">{voiceById(result.voice).name}</span>
              <span className="text-muted">{(result.samples.length / 24000).toFixed(1)}s</span>
              <button className={`${btn("secondary", "sm")} ml-auto`} onClick={() => download(result.blob, `${slug(text)}.wav`)}>Download WAV</button>
            </div>
            <Player blob={result.blob} samples={result.samples} color={voiceById(result.voice).color} />
          </div>
        )}
      </div>

      <aside className="space-y-4">
        <div className={`${card} space-y-5 p-4`}>
          <VoicePicker value={voice} onChange={setVoice} />
          <p className="text-xs text-muted">{v.vibe}</p>
          <label className="block">
            <span className="flex justify-between text-xs"><span className="text-muted">Speed</span><span className="tabular-nums">{speed.toFixed(2)}×</span></span>
            <input type="range" min={0.5} max={2} step={0.05} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="mt-2 w-full" />
          </label>
          {user ? (
            <div className="border-t border-line pt-4">
              <p className="text-xs text-muted">Presets</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {presets.map((p) => (
                  <button key={p._id} onClick={() => { setVoice(p.voice); setSpeed(p.speed); }}
                    className="flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs hover:border-line-strong">
                    <span className="size-2 rounded-full" style={{ background: p.color }} />{p.name}
                  </button>
                ))}
                <Link href="/dashboard/?tab=presets" className="rounded-full border border-dashed border-line px-2.5 py-1 text-xs text-muted hover:text-fg">Manage</Link>
              </div>
              {lexicon.length > 0 && <p className="mt-3 text-xs text-accent">{lexicon.length} pronunciation rule{lexicon.length > 1 && "s"} active</p>}
            </div>
          ) : (
            <p className="border-t border-line pt-4 text-xs leading-relaxed text-muted">
              <Link href="/auth/" className="text-fg underline underline-offset-2">Sign in</Link> to sync presets, pronunciation rules and projects across devices. It&apos;s free.
            </p>
          )}
        </div>

        <div className={`${card} p-4`}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">History</h2>
            {history.length > 0 && <button className="text-xs text-subtle hover:text-danger" onClick={() => clearHistory().then(refresh)}>Clear</button>}
          </div>
          <p className="text-xs text-subtle">Stored only in this browser</p>
          <ul className="mt-4 max-h-[34rem] space-y-4 overflow-y-auto">
            {history.map((h) => (
              <li key={h.id} className="space-y-2 border-b border-line pb-4 last:border-0">
                <p className="line-clamp-2 text-sm text-muted">{h.text}</p>
                <Player blob={h.blob} color={voiceById(h.voice).color} compact />
                <div className="flex gap-3 text-xs text-subtle">
                  <span>{voiceById(h.voice).name}</span>
                  <button className="hover:text-fg" onClick={() => { setText(h.text); setVoice(h.voice); setSpeed(h.speed); }}>Reuse</button>
                  <button className="hover:text-fg" onClick={() => download(h.blob, `${slug(h.text)}.wav`)}>Download</button>
                  <button className="ml-auto hover:text-danger" onClick={() => deleteHistory(h.id).then(refresh)}>Delete</button>
                </div>
              </li>
            ))}
            {!history.length && <li className="py-6 text-center text-xs text-subtle">Your generations will appear here.</li>}
          </ul>
        </div>
      </aside>
    </section>
  );
}

export default function StudioPage() {
  return <Suspense><Studio /></Suspense>;
}

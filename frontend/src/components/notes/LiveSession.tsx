"use client";
import { useEffect, useRef, useState } from "react";
import { SttStatus } from "@/components/SttStatus";
import { btn, card, LevelDots } from "@/components/ui";
import { micStream, startLive, type LiveSession as Live } from "@/lib/engine/live";
import { LIVE_MODEL, loadStt, STT_MODELS } from "@/lib/engine/stt";
import { notesDb, type Note, type NoteLine } from "@/lib/local-db";
import { newNote, stopwatch, touch } from "@/lib/notes";
import { cleanup } from "@/lib/speech/cleanup";
import { clock } from "@/lib/subtitles";

type Source = { speaker: string; live: Live; stream: MediaStream; extra?: MediaStream };

/** Live meeting capture: your mic as "You", a shared tab's audio as "Others", transcribed as people talk. */
export function LiveSession({ onDone }: { onDone: (id: string) => void }) {
  const [model, setModel] = useState(LIVE_MODEL);
  const [withTab, setWithTab] = useState(true);
  const [note, setNote] = useState<Note>(newNote);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [partials, setPartials] = useState<Record<string, string>>({});
  const [levels, setLevels] = useState<Record<string, number>>({});
  const [error, setError] = useState("");
  const sources = useRef<Source[]>([]);
  const noteRef = useRef(note);
  const since = useRef<() => number>(() => 0);
  const [speakers, setSpeakers] = useState<string[]>([]);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { loadStt(model); }, [model]);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setElapsed(since.current()), 1000);
    return () => clearInterval(t);
  }, [running]);
  useEffect(() => { end.current?.scrollIntoView({ block: "nearest" }); }, [note.lines.length, partials]);

  // Every change is written straight to IndexedDB, so a crashed tab loses nothing.
  const commit = (fn: (n: Note) => Note) => {
    const next = touch(fn(noteRef.current));
    noteRef.current = next;
    setNote(next);
    notesDb.put(next).catch(() => {});
  };

  const addSource = async (speaker: string, stream: MediaStream, extra?: MediaStream) => {
    const offset = since.current();
    const live = await startLive(stream, {
      model, language: null,
      vad: { silenceMs: 700, maxMs: 15000 },
      onPartial: (p) => setPartials((x) => ({ ...x, [speaker]: p })),
      onLevel: (l) => setLevels((x) => ({ ...x, [speaker]: l })),
      onFinal: (f) => {
        setPartials((x) => ({ ...x, [speaker]: "" }));
        const text = cleanup(f.text, { commands: false }).text;
        if (!text) return;
        const line: NoteLine = { id: crypto.randomUUID(), speaker, text, start: offset + f.start, end: offset + f.end };
        commit((n) => ({ ...n, lines: [...n.lines, line].sort((a, b) => a.start - b.start) }));
      },
      onError: (e) => setError(e.message),
    });
    sources.current.push({ speaker, live, stream, extra });
  };

  const start = async () => {
    setError("");
    since.current = stopwatch();
    try {
      if (withTab) {
        // Chrome only shares tab audio alongside video; we keep the audio and drop the picture.
        const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        const audio = display.getAudioTracks();
        if (!audio.length) {
          display.getTracks().forEach((t) => t.stop());
          throw new Error("No meeting audio was shared. Pick the meeting tab and turn on “Share tab audio”, or untick meeting audio.");
        }
        display.getVideoTracks().forEach((t) => t.stop());
        await addSource("Others", new MediaStream(audio), display);
      }
      await addSource("You", await micStream());
      commit((n) => n);
      setSpeakers(sources.current.map((s) => s.speaker));
      setRunning(true);
    } catch (e) {
      await stopAll();
      const err = e as Error;
      setError(err.name === "NotAllowedError" ? "Permission was denied. Allow the microphone (and screen share for meeting audio) and try again." : err.message);
    }
  };

  const stopAll = async () => {
    const all = sources.current;
    sources.current = [];
    for (const s of all) {
      s.stream.getTracks().forEach((t) => t.stop());
      s.extra?.getTracks().forEach((t) => t.stop());
    }
    await Promise.all(all.map((s) => s.live.stop().catch(() => {})));
  };

  const finish = async () => {
    setRunning(false);
    await stopAll();
    commit((n) => ({ ...n, duration: since.current() }));
    onDone(noteRef.current.id);
  };

  useEffect(() => () => { void stopAll(); }, []);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <div className={`${card} flex min-h-[32rem] flex-col`}>
        <div className="flex flex-wrap items-center gap-4 border-b border-line p-4">
          <input value={note.title} onChange={(e) => commit((n) => ({ ...n, title: e.target.value }))}
            className="display min-w-0 flex-1 bg-transparent text-2xl focus:outline-none" aria-label="Note title" />
          {running && <span className="flex items-center gap-2 font-mono text-sm text-accent"><span className="size-2 animate-pulse-dot rounded-full bg-accent-strong" />{clock(elapsed)}</span>}
          {running
            ? <button className={btn("primary", "md")} onClick={finish}>Stop & summarize</button>
            : <button className={btn("primary", "md")} onClick={start}>Start recording</button>}
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-5" aria-live="polite">
          {!running && !note.lines.length && (
            <div className="grid h-full place-items-center py-16 text-center text-sm text-subtle">
              <p>Start recording, then talk or join your call.<br />Lines appear a moment after each person pauses.</p>
            </div>
          )}
          {note.lines.map((l) => (
            <div key={l.id} className="grid grid-cols-[4.5rem_1fr] gap-3">
              <div>
                <p className={`label text-xs ${l.speaker === "You" ? "text-accent" : "text-fg"}`}>{l.speaker}</p>
                <p className="font-mono text-[10px] text-subtle">{clock(l.start)}</p>
              </div>
              <p className="text-[15px] leading-relaxed">{l.text}</p>
            </div>
          ))}
          {Object.entries(partials).filter(([, p]) => p).map(([sp, p]) => (
            <div key={sp} className="grid grid-cols-[4.5rem_1fr] gap-3 opacity-60">
              <p className="label text-xs text-muted">{sp}</p>
              <p className="text-[15px] italic leading-relaxed text-muted">{p}…</p>
            </div>
          ))}
          <div ref={end} />
        </div>
        {running && (
          <div className="flex flex-wrap gap-5 border-t border-line px-5 py-3 text-xs text-muted">
            {speakers.map((s) => <span key={s} className="flex items-center gap-2">{s} <LevelDots level={levels[s] ?? 0} active /></span>)}
          </div>
        )}
      </div>

      <aside className="space-y-4">
        <div className={`${card} space-y-4 p-5`}>
          <h2 className="label text-sm text-accent">Setup</h2>
          <select value={model} disabled={running} onChange={(e) => setModel(e.target.value)} className="w-full rounded-sm border border-line bg-bg px-3 py-2 text-sm">
            {STT_MODELS.map((m) => <option key={m.id} value={m.id}>{m.name} · {m.note}</option>)}
          </select>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={withTab} disabled={running} onChange={(e) => setWithTab(e.target.checked)} className="mt-1 accent-[var(--color-accent)]" />
            <span>Capture meeting audio<span className="block text-xs text-muted">Share the Meet, Zoom or Teams tab with &ldquo;Share tab audio&rdquo; on. Others are labelled separately from you.</span></span>
          </label>
          <p className="text-xs text-subtle">Tip: use headphones so your mic doesn&apos;t hear the call twice.</p>
          <SttStatus />
          {error && <p className="rounded-sm border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{error}</p>}
        </div>
        <div className={`${card} p-5`}>
          <h2 className="label text-sm text-accent">Your notes</h2>
          <textarea value={note.scratch} onChange={(e) => commit((n) => ({ ...n, scratch: e.target.value }))} rows={10}
            placeholder="Jot anything; it's saved with the transcript."
            className="mt-3 w-full resize-y bg-transparent text-sm leading-relaxed placeholder:text-subtle focus:outline-none" />
        </div>
      </aside>
    </div>
  );
}

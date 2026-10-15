"use client";
import { useEffect, useRef, useState } from "react";
import { SttStatus } from "@/components/SttStatus";
import { btn, card, LevelDots } from "@/components/ui";
import { micStream, startLive, type LiveSession as Live } from "@/lib/engine/live";
import { STT_MODELS, useStt, warmStt } from "@/lib/engine/stt";
import { notesDb, type Note, type NoteLine } from "@/lib/local-db";
import { addLine, newNote, stopwatch, touch, type NoteKind } from "@/lib/notes";
import { cleanup, joinText } from "@/lib/speech/cleanup";
import { useDictateSettings } from "@/lib/speech/settings";
import { useSnippets } from "@/lib/speech/snippets";
import { clock } from "@/lib/subtitles";

type Source = { speaker: string; live: Live; streams: MediaStream[] };

const MODES: [NoteKind, string, string][] = [
  ["meeting", "Meeting transcript", "Record a call. Your mic is labelled You and the shared meeting tab is labelled Others. Get highlights, actions and decisions when you stop."],
  ["personal", "My own notes", "Talk to write a note. Voice commands work (“new line”, “bullet point”, “scratch that”) and you can edit the text as you go."],
];

const QUIET = 0.004; // peak mic level below this for several seconds means we are hearing nothing

/** Live capture for both kinds of note: a meeting transcript (mic + tab audio) or your own dictated note. */
export function LiveSession({ onDone }: { onDone: (id: string) => void }) {
  const { settings } = useDictateSettings();
  const { items: snippets } = useSnippets();
  const stt = useStt();
  const [model, setModel] = useState(settings.model);
  const [kind, setKind] = useState<NoteKind>("meeting");
  const [withTab, setWithTab] = useState(true);
  const [note, setNote] = useState<Note>(() => newNote("meeting"));
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [partials, setPartials] = useState<Record<string, string>>({});
  const [levels, setLevels] = useState<Record<string, number>>({});
  const [speakers, setSpeakers] = useState<string[]>([]);
  const [silent, setSilent] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const sources = useRef<Source[]>([]);
  const noteRef = useRef(note);
  const since = useRef<() => number>(() => 0);
  const peaks = useRef<Record<string, number>>({});
  const pieces = useRef<string[]>([]); // personal mode: what each phrase added, for "scratch that"
  const end = useRef<HTMLDivElement>(null);
  const personal = kind === "personal";

  useEffect(() => { warmStt(model); }, [model]);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      const s = since.current();
      setElapsed(s);
      // After a few seconds, say so if a source has been completely silent (muted mic, wrong device, no tab audio).
      if (s > 6) setSilent(Object.keys(peaks.current).filter((k) => peaks.current[k] < QUIET));
    }, 1000);
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

  const chooseKind = (k: NoteKind) => {
    setKind(k);
    const fresh = { ...newNote(k), id: noteRef.current.id };
    noteRef.current = fresh;
    setNote(fresh);
  };

  const onPhrase = (speaker: string, offset: number) => (f: { text: string; start: number; end: number }) => {
    setPartials((x) => ({ ...x, [speaker]: "" }));
    if (personal) {
      const r = cleanup(f.text, { fillers: settings.fillers, commands: settings.commands, snippets });
      commit((n) => {
        if (r.undoPrevious) {
          const last = pieces.current.pop();
          return last && n.scratch.endsWith(last) ? { ...n, scratch: n.scratch.slice(0, -last.length).trimEnd() } : n;
        }
        if (!r.text) return n;
        const scratch = joinText(n.scratch, r.text);
        pieces.current.push(scratch.slice(n.scratch.length));
        return { ...n, scratch };
      });
      return;
    }
    const text = cleanup(f.text, { commands: false, snippets }).text;
    if (!text) return;
    const line: NoteLine = { id: crypto.randomUUID(), speaker, text, start: offset + f.start, end: offset + f.end };
    commit((n) => ({ ...n, lines: addLine(n.lines, line) }));
  };

  const addSource = async (speaker: string, stream: MediaStream, keep: MediaStream[] = [stream]) => {
    const offset = since.current();
    peaks.current[speaker] = 0;
    const live = await startLive(stream, {
      model, language: null,
      vad: { silenceMs: personal ? 600 : 700, maxMs: 15000, sensitivity: settings.sensitivity },
      onPartial: (p) => setPartials((x) => ({ ...x, [speaker]: p })),
      onLevel: (l) => {
        peaks.current[speaker] = Math.max(peaks.current[speaker] ?? 0, l);
        setLevels((x) => ({ ...x, [speaker]: l }));
      },
      onFinal: onPhrase(speaker, offset),
      onError: (e) => setError(e.message),
    });
    sources.current.push({ speaker, live, streams: keep });
  };

  const start = async () => {
    setError(""); setNotice(""); setSilent([]);
    since.current = stopwatch();
    try {
      if (!personal && withTab) {
        // Chrome only shares tab audio together with video. The video track stays alive (unused): stopping it can end
        // the whole capture, audio included.
        const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        const audio = display.getAudioTracks();
        if (!audio.length) {
          display.getTracks().forEach((t) => t.stop());
          throw new Error("No meeting audio was shared. Choose the meeting's Chrome tab and turn on “Also share tab audio”, or untick meeting audio to record only your mic.");
        }
        audio[0].addEventListener("ended", () => setNotice("Meeting audio stopped being shared. Your mic is still recording."));
        await addSource("Others", new MediaStream(audio), [display]);
      }
      await addSource(personal ? "Me" : "You", await micStream());
      commit((n) => n);
      setSpeakers(sources.current.map((s) => s.speaker));
      setRunning(true);
    } catch (e) {
      await stopAll();
      const err = e as Error;
      setError(err.name === "NotAllowedError"
        ? "Permission was denied. Allow the microphone (and screen sharing for meeting audio) in the address bar, then try again."
        : err.name === "NotFoundError" ? "No microphone was found. Plug one in or pick an input in your system sound settings." : err.message);
    }
  };

  const stopAll = async () => {
    const all = sources.current;
    sources.current = [];
    for (const s of all) s.streams.forEach((m) => m.getTracks().forEach((t) => t.stop()));
    await Promise.all(all.map((s) => s.live.stop().catch(() => {})));
  };

  const finish = async () => {
    setRunning(false);
    await stopAll();
    commit((n) => ({ ...n, duration: since.current() }));
    onDone(noteRef.current.id);
  };

  useEffect(() => () => { void stopAll(); }, []);

  const loading = running && stt.status === "loading";
  const status = (
    <>
      {loading && (
        <p className="border-b border-accent/30 bg-accent-soft px-5 py-2.5 text-sm text-accent">
          Recording. The speech model is still loading ({Math.round(stt.progress * 100)}%); your words are kept and appear as soon as it&apos;s ready.
        </p>
      )}
      {running && silent.map((s) => (
        <p key={s} className="border-b border-danger/30 bg-danger/10 px-5 py-2.5 text-sm text-danger">
          {s === "Others"
            ? "No sound from the shared meeting tab yet. Make sure the call is playing in that tab and “Also share tab audio” was on."
            : "We can't hear your microphone. Check it isn't muted, or pick the right input from the mic icon in the address bar."}
        </p>
      ))}
      {notice && <p className="border-b border-line bg-elevated px-5 py-2.5 text-sm text-muted">{notice}</p>}
    </>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <div className={`${card} flex min-h-[32rem] flex-col`}>
        <div className="flex flex-wrap items-center gap-4 border-b border-line p-4">
          <input value={note.title} onChange={(e) => commit((n) => ({ ...n, title: e.target.value }))}
            className="display min-w-0 flex-1 bg-transparent text-2xl focus:outline-none" aria-label="Note title" />
          {running && <span className="flex items-center gap-2 font-mono text-sm text-accent"><span className="size-2 animate-pulse-dot rounded-full bg-accent-strong" />{clock(elapsed)}</span>}
          {running
            ? <button className={btn("primary", "md")} onClick={finish}>{personal ? "Stop & save" : "Stop & summarize"}</button>
            : <button className={btn("primary", "md")} onClick={start}>{personal ? "Start talking" : "Start recording"}</button>}
        </div>
        {status}

        {!running && !note.lines.length && !note.scratch && (
          <div className="grid gap-3 p-5 sm:grid-cols-2" role="radiogroup" aria-label="What are you recording?">
            {MODES.map(([k, title, body]) => (
              <button key={k} role="radio" aria-checked={kind === k} onClick={() => chooseKind(k)}
                className={`rounded-md border p-5 text-left transition-colors ${kind === k ? "border-accent bg-accent-soft" : "border-line hover:border-line-strong"}`}>
                <span className="flex items-center gap-2">
                  <span className={`grid size-4 place-items-center rounded-full border ${kind === k ? "border-accent" : "border-line-strong"}`}>
                    {kind === k && <span className="size-2 rounded-full bg-accent" />}
                  </span>
                  <span className="display text-2xl">{title}</span>
                </span>
                <span className="mt-2 block text-sm leading-relaxed text-muted">{body}</span>
              </button>
            ))}
          </div>
        )}

        {personal ? (
          <div className="flex flex-1 flex-col">
            <textarea value={note.scratch} onChange={(e) => { pieces.current = []; commit((n) => ({ ...n, scratch: e.target.value })); }}
              placeholder={running ? "Start talking…" : "Your note will appear here as you talk. You can also type."}
              className="min-h-72 flex-1 resize-none bg-transparent p-5 text-[17px] leading-relaxed placeholder:text-subtle focus:outline-none" />
            {partials.Me && <p className="border-t border-line px-5 py-3 text-[15px] italic text-muted">{partials.Me}…</p>}
          </div>
        ) : (
          <div className="flex-1 space-y-4 overflow-y-auto p-5" aria-live="polite">
            {!running && !note.lines.length && (
              <p className="py-6 text-center text-sm text-subtle">Press Start recording, then talk or join your call. Lines appear a moment after each person pauses.</p>
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
        )}

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
          {!personal && (
            <>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={withTab} disabled={running} onChange={(e) => setWithTab(e.target.checked)} className="mt-1 accent-[var(--color-accent)]" />
                <span>Capture meeting audio<span className="block text-xs text-muted">Chrome asks what to share: pick the Meet, Zoom or Teams <b>tab</b> and turn on &ldquo;Also share tab audio&rdquo;. Untick to record only your mic (in-room meetings).</span></span>
              </label>
              <p className="text-xs text-subtle">Without headphones your mic also hears the call; Kelados drops those echoes and keeps the cleaner copy.</p>
            </>
          )}
          {personal && <p className="text-xs leading-relaxed text-muted">Say &ldquo;new line&rdquo;, &ldquo;new paragraph&rdquo;, &ldquo;bullet point&rdquo; or &ldquo;scratch that&rdquo;. Your snippets and dictionary from Dictate work here too.</p>}
          <SttStatus />
          {error && <p className="rounded-sm border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{error}</p>}
        </div>
        {!personal && (
          <div className={`${card} p-5`}>
            <h2 className="label text-sm text-accent">Your notes</h2>
            <textarea value={note.scratch} onChange={(e) => commit((n) => ({ ...n, scratch: e.target.value }))} rows={10}
              placeholder="Jot anything; it's saved with the transcript."
              className="mt-3 w-full resize-y bg-transparent text-sm leading-relaxed placeholder:text-subtle focus:outline-none" />
          </div>
        )}
      </aside>
    </div>
  );
}

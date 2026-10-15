"use client";
import { useMemo, useState } from "react";
import { btn, card } from "@/components/ui";
import { download, slug } from "@/lib/audio";
import { speak } from "@/lib/engine/tts";
import { notesDb, type Note } from "@/lib/local-db";
import { noteToMarkdown, touch, transcriptText } from "@/lib/notes";
import { summarize } from "@/lib/speech/summary";
import { clock, toSrt } from "@/lib/subtitles";

const SECTIONS = [["highlights", "Highlights"], ["actions", "Action items"], ["decisions", "Decisions"], ["questions", "Open questions"]] as const;

export function NoteView({ initial, onDelete }: { initial: Note; onDelete: () => void }) {
  const [note, setNote] = useState(initial);
  const [q, setQ] = useState("");
  const [reading, setReading] = useState<{ stop: () => void } | null>(null);
  const summary = useMemo(() => summarize(transcriptText(note)), [note]);
  const speakers = [...new Set(note.lines.map((l) => l.speaker))];
  const lines = q ? note.lines.filter((l) => l.text.toLowerCase().includes(q.toLowerCase())) : note.lines;

  const save = (patch: Partial<Note>) => {
    const next = touch({ ...note, ...patch });
    setNote(next);
    notesDb.put(next).catch(() => {});
  };
  const rename = (from: string, to: string) => save({ lines: note.lines.map((l) => (l.speaker === from ? { ...l, speaker: to } : l)) });
  const readSummary = () => {
    if (reading) { reading.stop(); setReading(null); return; }
    const r = speak([...summary.highlights, ...summary.actions].join(" ") || "There's nothing to summarize yet.");
    setReading(r);
    r.done.catch(() => {}).finally(() => setReading(null));
  };
  const name = slug(note.title);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
      <div className="space-y-4">
        <div className={`${card} p-5`}>
          <input value={note.title} onChange={(e) => save({ title: e.target.value })} className="display w-full bg-transparent text-3xl focus:outline-none" aria-label="Title" />
          <p className="mt-1 font-mono text-[11px] text-subtle">{new Date(note.createdAt).toLocaleString()} · {clock(note.duration)} · {note.lines.length} lines</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className={btn("primary", "sm")} onClick={() => navigator.clipboard.writeText(noteToMarkdown(note))}>Copy markdown</button>
            <button className={btn("secondary", "sm")} onClick={() => download(new Blob([noteToMarkdown(note)]), `${name}.md`)}>.md</button>
            <button className={btn("secondary", "sm")} onClick={() => download(new Blob([note.lines.map((l) => `${l.speaker}: ${l.text}`).join("\n")]), `${name}.txt`)}>.txt</button>
            <button className={btn("secondary", "sm")} onClick={() => download(new Blob([toSrt(note.lines.map((l) => ({ text: `${l.speaker}: ${l.text}`, start: l.start, end: l.end })))]), `${name}.srt`)}>.srt</button>
            <button className={btn("secondary", "sm")} onClick={readSummary}>{reading ? "Stop" : "Listen to summary"}</button>
            <button className={btn("danger", "sm")} onClick={async () => { await notesDb.remove(note.id); onDelete(); }}>Delete</button>
          </div>
        </div>

        <div className={`${card} space-y-5 p-5`}>
          {SECTIONS.map(([k, title]) => summary[k].length > 0 && (
            <section key={k}>
              <h3 className="label text-xs text-accent">{title}</h3>
              <ul className="mt-2 space-y-1.5 text-sm leading-relaxed">
                {summary[k].map((s) => <li key={s} className="flex gap-2"><span className="mt-2 size-1 shrink-0 rounded-full bg-accent" />{s}</li>)}
              </ul>
            </section>
          ))}
          {summary.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {summary.keywords.map((k) => <button key={k} onClick={() => setQ(k)} className="rounded-sm border border-line px-2 py-0.5 font-mono text-[11px] text-muted hover:border-accent/50 hover:text-accent">{k}</button>)}
            </div>
          )}
          {!summary.highlights.length && <p className="text-sm text-subtle">Not enough speech for a summary yet.</p>}
          <p className="text-[11px] leading-relaxed text-subtle">Pulled straight from what was said, on your device, with no AI rewriting, so nothing is invented.</p>
        </div>

        {note.scratch.trim() && (
          <div className={`${card} p-5`}>
            <h3 className="label text-xs text-accent">Your notes</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">{note.scratch}</p>
          </div>
        )}
      </div>

      <div className={`${card} flex max-h-[80vh] flex-col`}>
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search transcript"
            className="min-w-0 flex-1 rounded-sm border border-line bg-bg px-3 py-1.5 text-sm focus:border-accent/50 focus:outline-none" />
          {speakers.map((s) => (
            <input key={s} defaultValue={s} onBlur={(e) => e.target.value.trim() && e.target.value !== s && rename(s, e.target.value.trim())}
              className="label w-24 rounded-sm border border-line bg-bg px-2 py-1 text-xs text-accent" aria-label={`Rename ${s}`} title="Rename speaker" />
          ))}
        </div>
        <div className="space-y-4 overflow-y-auto p-5">
          {lines.map((l) => (
            <div key={l.id} className="grid grid-cols-[4.5rem_1fr] gap-3">
              <div>
                <p className="label text-xs text-accent">{l.speaker}</p>
                <p className="font-mono text-[10px] text-subtle">{clock(l.start)}</p>
              </div>
              <p className="text-[15px] leading-relaxed">{l.text}</p>
            </div>
          ))}
          {!lines.length && <p className="text-sm text-subtle">{q ? "No matches." : "No speech was captured."}</p>}
        </div>
      </div>
    </div>
  );
}

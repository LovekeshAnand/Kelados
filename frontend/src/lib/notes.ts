import type { Note, NoteLine } from "./local-db";
import { summarize } from "./speech/summary.ts";
import { clock } from "./subtitles.ts";

export type NoteKind = "meeting" | "personal";
export const isPersonal = (n: Note) => n.kind === "personal";

/** The text summaries are built from: the transcript of a meeting, or the body of a personal note. */
export const transcriptText = (n: Note) => (isPersonal(n) ? n.scratch : n.lines.map((l) => l.text).join(" "));

export function noteToMarkdown(n: Note) {
  const s = summarize(transcriptText(n));
  const list = (title: string, xs: string[]) => (xs.length ? `## ${title}\n\n${xs.map((x) => `- ${x}`).join("\n")}\n\n` : "");
  const head = `# ${n.title}\n\n_${new Date(n.createdAt).toLocaleString()} · ${clock(n.duration)}_\n\n`;
  if (isPersonal(n)) return head + `${n.scratch.trim()}\n\n` + list("Action items", s.actions) + list("Open questions", s.questions);
  return head +
    list("Highlights", s.highlights) + list("Action items", s.actions) + list("Decisions", s.decisions) + list("Open questions", s.questions) +
    (n.scratch.trim() ? `## My notes\n\n${n.scratch.trim()}\n\n` : "") +
    `## Transcript\n\n${n.lines.map((l) => `**${l.speaker}** [${clock(l.start)}]: ${l.text}`).join("\n\n")}\n`;
}

export const newNote = (kind: NoteKind = "meeting"): Note => ({
  id: crypto.randomUUID(), kind,
  title: `${kind === "personal" ? "Note" : "Meeting"} · ${new Date().toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}`,
  createdAt: Date.now(), updatedAt: Date.now(), duration: 0, lines: [], scratch: "",
});

export const touch = (n: Note): Note => ({ ...n, updatedAt: Date.now() });

/** Seconds since the call, for timestamping live lines. */
export function stopwatch() {
  const t0 = performance.now();
  return () => (performance.now() - t0) / 1000;
}

const words = (s: string) => new Set(s.toLowerCase().match(/[a-z0-9']+/g) ?? []);

/**
 * Without headphones your mic also hears the call, so the same sentence arrives twice: once from the
 * shared tab, once from the mic. Two lines from different sources, close in time and mostly the same words, are an echo.
 */
export function isEcho(a: Pick<NoteLine, "speaker" | "text" | "start">, b: Pick<NoteLine, "speaker" | "text" | "start">) {
  if (a.speaker === b.speaker || Math.abs(a.start - b.start) > 4) return false;
  const x = words(a.text), y = words(b.text);
  if (!x.size || !y.size) return false;
  let shared = 0;
  x.forEach((w) => { if (y.has(w)) shared++; });
  return shared / Math.min(x.size, y.size) >= 0.6;
}

/**
 * Add a line in time order. If it echoes a line from the other source, the meeting-audio copy wins:
 * it is the cleaner recording and the right speaker.
 */
export function addLine(lines: NoteLine[], line: NoteLine, echoSpeaker = "You") {
  const echo = lines.find((l) => isEcho(l, line));
  if (echo) {
    if (line.speaker === echoSpeaker) return lines; // mic copy of something already heard from the call
    lines = lines.filter((l) => l !== echo); // the call copy replaces the mic copy that arrived first
  }
  return [...lines, line].sort((a, b) => a.start - b.start);
}

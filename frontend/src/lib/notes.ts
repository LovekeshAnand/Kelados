import type { Note } from "./local-db";
import { summarize } from "./speech/summary";
import { clock } from "./subtitles";

export const transcriptText = (n: Note) => n.lines.map((l) => l.text).join(" ");

export function noteToMarkdown(n: Note) {
  const s = summarize(transcriptText(n));
  const list = (title: string, xs: string[]) => (xs.length ? `## ${title}\n\n${xs.map((x) => `- ${x}`).join("\n")}\n\n` : "");
  return `# ${n.title}\n\n_${new Date(n.createdAt).toLocaleString()} · ${clock(n.duration)}_\n\n` +
    list("Highlights", s.highlights) + list("Action items", s.actions) + list("Decisions", s.decisions) + list("Open questions", s.questions) +
    (n.scratch.trim() ? `## My notes\n\n${n.scratch.trim()}\n\n` : "") +
    `## Transcript\n\n${n.lines.map((l) => `**${l.speaker}** [${clock(l.start)}]: ${l.text}`).join("\n\n")}\n`;
}

export const newNote = (): Note => ({
  id: crypto.randomUUID(), title: `Meeting · ${new Date().toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}`,
  createdAt: Date.now(), updatedAt: Date.now(), duration: 0, lines: [], scratch: "",
});

export const touch = (n: Note): Note => ({ ...n, updatedAt: Date.now() });

/** Seconds since the call, for timestamping live lines. */
export function stopwatch() {
  const t0 = performance.now();
  return () => (performance.now() - t0) / 1000;
}

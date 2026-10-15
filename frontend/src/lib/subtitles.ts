export type Cue = { text: string; start: number; end: number | null };

export const stamp = (s: number, sep: "," | ".") => {
  const ms = Math.round(s * 1000);
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)}${sep}${p(ms % 1000, 3)}`;
};

export const clock = (s: number) => stamp(s, ".").slice(s >= 3600 ? 0 : 3, 8);

export const toSrt = (c: Cue[]) =>
  c.map((x, i) => `${i + 1}\n${stamp(x.start, ",")} --> ${stamp(x.end ?? x.start + 2, ",")}\n${x.text.trim()}\n`).join("\n");

export const toVtt = (c: Cue[]) =>
  "WEBVTT\n\n" + c.map((x) => `${stamp(x.start, ".")} --> ${stamp(x.end ?? x.start + 2, ".")}\n${x.text.trim()}\n`).join("\n");

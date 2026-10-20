// Rule-based text formats for the radial menu's Format segment. No language model: instant, private, and nothing
// is ever invented. Each takes plain text and returns the reshaped text.
import { cleanup } from "./cleanup.ts"; // .ts so node --test can load it too
import { bulletize } from "./edit.ts";

const sentences = (t: string) =>
  (t.replace(/\s+/g, " ").trim().match(/[^.!?।]+[.!?।]+(?=\s|$)|[^.!?।]+$/g) ?? []).map((s) => s.trim()).filter(Boolean);
// Lines with any list marker removed: "- Eggs", "• Eggs", "2. Eggs" → "Eggs".
const lines = (t: string) => t.split("\n").map((l) => l.replace(/^\s*(?:[-•*]|\d+[.)])\s+/, "").trim()).filter(Boolean);
const endWith = (s: string) => (/[.!?।:]$/.test(s) ? s : `${s}.`);

/** One item per line; a single sentence like "eggs, milk and coffee" splits at its commas, prose splits at sentences. */
export function toBullets(text: string) {
  const ls = lines(text);
  if (ls.length > 1) return ls.map((l) => `- ${l}`).join("\n");
  const list = bulletize(text);
  if (list) return list;
  const ss = sentences(text);
  return ss.length ? ss.map((s) => `- ${s}`).join("\n") : text;
}

export function toNumbered(text: string) {
  let n = 0;
  return toBullets(text).split("\n").map((l) => (l.startsWith("- ") ? `${++n}. ${l.slice(2)}` : l)).join("\n");
}

/** Back to flowing prose: list items and lines become sentences in one paragraph. */
export function toParagraph(text: string) {
  return lines(text).map((l) => endWith(l.replace(/:$/, "."))).join(" ");
}

/** A ready-to-send email around the text. */
export function toEmail(text: string) {
  return `Hi,\n\n${toParagraph(text)}\n\nThanks,`;
}

// Spoken padding that adds nothing in writing. Removed only where it's clearly filler (", you know,", "basically").
// "like" only counts as filler when set off with a comma ("it was, like, huge"), never as a verb ("I like it").
const HEDGES = /(^|[\s,])(?:basically|literally|honestly|kind of|sort of|you know|i mean)(?=[\s,.!?]|$),?|,\s*like,/gi;
// Wordy phrases and their plain versions.
const PLAIN: [RegExp, string][] = [
  [/\bin order to\b/gi, "to"], [/\bdue to the fact that\b/gi, "because"], [/\bat this point in time\b/gi, "now"],
  [/\bin the event that\b/gi, "if"], [/\bfor the purpose of\b/gi, "for"], [/\bwith regards? to\b/gi, "about"],
  [/\b(is|are) able to\b/gi, "can"], [/\bwas able to\b/gi, "could"], [/\beach and every\b/gi, "every"],
  [/\bfirst and foremost\b/gi, "first"], [/\bmake a decision\b/gi, "decide"], [/\bin spite of the fact that\b/gi, "although"],
  [/\bgonna\b/gi, "going to"], [/\bwanna\b/gi, "want to"], [/\bgotta\b/gi, "have to"], [/\bkinda\b/gi, "a bit"],
  [/\breally very\b/gi, "very"], [/\bvery very\b/gi, "very"],
];
// Openers that only buy time when speaking: "So,", "Okay so", "Well,", "Actually,".
const OPENER = /^(?:(?:ok(?:ay)?|so|well|actually|right|alright|anyway)[,.]?\s+)+/i;

/** One sentence, tightened: fillers, hedges, wordy phrases and spoken openers out; capital and full stop in. */
function tighten(sentence: string) {
  let t = cleanup(sentence, { fillers: true, commands: false }).text;
  t = t.replace(HEDGES, "$1");
  for (const [re, plain] of PLAIN) t = t.replace(re, (m) => (/^[A-Z]/.test(m) ? plain[0].toUpperCase() + plain.slice(1) : plain));
  t = t.replace(OPENER, "").replace(/\s{2,}/g, " ").replace(/\s+([,.!?])/g, "$1").replace(/,\s*,/g, ",").replace(/^[,\s]+/, "").trim();
  return t ? t[0].toUpperCase() + t.slice(1) : t;
}

/**
 * Make it read like writing, without inventing anything: tighten each sentence and split run-ons at ", and then" /
 * ", and so". Lists keep their markers. Rule-based, so it's instant and private.
 */
export function refine(text: string) {
  return text.split("\n").map((line) => {
    const marker = line.match(/^\s*(?:[-•*]|\d+[.)])\s+/)?.[0] ?? "";
    const body = line.slice(marker.length).replace(/,?\s+and (then|so)\s+/gi, (_, w) => `. ${w === "so" ? "So" : "Then"} `);
    const out = sentences(body).map(tighten).filter(Boolean).map((s) => (s.split(/\s+/).length >= 3 || marker ? endWith(s) : s));
    if (!out.length) return marker.trim() ? "" : line.trim();
    return marker ? `${marker.trim()} ${out.join(" ").replace(/\.$/, "")}` : out.join(" ");
  }).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export type DiffPart = { kind: "same" | "add" | "del"; text: string };

/** Word-level difference between two texts, for showing what a suggestion changes (LCS; plain text above ~600 words). */
export function diffWords(a: string, b: string): DiffPart[] {
  // Each word keeps its trailing space, so neighbouring changes merge into one highlighted run.
  const x = a.match(/\S+\s*|\s+/g) ?? [], y = b.match(/\S+\s*|\s+/g) ?? [];
  if (x.length * y.length > 360_000) return [{ kind: "del", text: a }, { kind: "add", text: b }];
  const L = Array.from({ length: x.length + 1 }, () => new Uint16Array(y.length + 1));
  for (let i = x.length - 1; i >= 0; i--) for (let j = y.length - 1; j >= 0; j--)
    L[i][j] = x[i] === y[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out: DiffPart[] = [];
  const push = (kind: DiffPart["kind"], text: string) => {
    const last = out[out.length - 1];
    if (last?.kind === kind) last.text += text; else out.push({ kind, text });
  };
  let i = 0, j = 0;
  while (i < x.length && j < y.length) {
    if (x[i] === y[j]) { push("same", x[i]); i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) push("del", x[i++]);
    else push("add", y[j++]);
  }
  while (i < x.length) push("del", x[i++]);
  while (j < y.length) push("add", y[j++]);
  return out;
}

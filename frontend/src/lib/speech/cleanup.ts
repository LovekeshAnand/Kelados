// Rule-based dictation cleanup: no language model, runs in microseconds, fully predictable.
// Whisper/Moonshine already punctuate and capitalise; these rules handle what speech adds on top.

export type Snippet = { trigger: string; text: string };
export type CleanupOptions = { fillers?: boolean; commands?: boolean; snippets?: Snippet[] };
export type Cleaned = { text: string; undoPrevious: boolean };

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// A spoken command arrives wrapped in the model's own punctuation ("Hello, new line. Next"), so eat it.
const cmd = (words: string) => new RegExp(`[\\s,.;:!?]*\\b${words}\\b[\\s,.;:!?]*`, "gi");

const FILLERS = /(^|[\s,])(?:u+m+|u+h+m*|e+r+m+|e+r+|a+h+|h+m+|m+h*m+)(?=[\s,.!?]|$)[,]?/gi;

// Order matters: multi-word commands before the single words they contain.
const COMMANDS: [RegExp, string][] = [
  [cmd("new paragraph"), "\n\n"],
  [cmd("(?:new|next) line"), "\n"],
  [cmd("(?:new |next )?bullet(?: point)?"), "\n- "],
  [cmd("question mark"), "? "],
  [cmd("exclamation (?:mark|point)"), "! "],
  [cmd("full stop"), ". "],
  [cmd("semicolon"), "; "],
  [cmd("colon"), ": "],
  [cmd("comma"), ", "],
  [/[\s,]*\bperiod[.!?]?\s*$/i, "."], // only at the very end; "a period of time" stays
];

// "make that a bullet list", "turn it into bullet points", "bullet that": an edit of the text already typed (see
// edit.ts), so the "bullet point" command below must not turn its words into a list marker first.
export const LIST_EDIT = /^(?:(?:make|turn|format|put)\s+(?:that|it|this)(?:\s+(?:into|in|as))?(?:\s+an?)?\s+(?:bullet(?:ed)?(?:\s+points?|\s+list)?|list)|bullet\s+(?:that|it|this))[.!]?$/i;

// Hindi (Devanagari) isn't \w, so \b never matches it; these Unicode-aware edges work for both scripts.
const B = "(?<![\\p{L}\\p{M}\\p{N}])", E = "(?![\\p{L}\\p{M}\\p{N}])";
const HINDI_COMMANDS: [RegExp, string][] = [
  ["नया (?:पैराग्राफ|अनुच्छेद)", "\n\n"], ["नई (?:लाइन|पंक्ति)", "\n"], ["पूर्ण ?विराम", "। "],
  ["प्रश्न ?(?:वाचक )?चिह्न", "? "], ["अल्प ?विराम", ", "],
].map(([w, out]) => [new RegExp(`[\\s,.;:!?।]*${B}${w}${E}[\\s,.;:!?।]*`, "gu"), out]);
const HINDI_FILLERS = new RegExp(`${B}(?:[उअह]म्?म+|अं+)${E}[,]?`, "gu");

// "scratch that" at the start undoes the previous dictation; mid-text it drops the sentence before it.
const SCRATCH = /\b(?:scratch|delete|undo) that\b[.!,]?/i;

// A spoken self-correction, the last one first (greedy prefix): "on Wednesday 6pm, no no, at 8pm on Friday". Hindi: "नहीं नहीं", "मेरा मतलब".
const CORRECTION = new RegExp(
  `^(.*)[\\s,.]*${B}(?:no,? no|no,? wait|wait,? no|no,? sorry|sorry,? I meant?|I meant|correction|make that|or rather|actually,? no|नहीं,? नहीं|नहीं,? रुको|मेरा मतलब|nahi,? nahi)${E}[\\s,.:।]*(.+)$`, "iu");

// A new sentence that opens with a plain "No," / "Actually," is only a correction when it restates the one before
// ("…meeting for Friday at 9. No, we can schedule the meeting for Wednesday at 8."), so "No, that's fine" is left alone.
const SOFT = new RegExp(`^([\\s\\S]*?[.!?।])\\s+(?:no|actually|wait|sorry|oh|नहीं)${E}[,.]?\\s+([\\s\\S]+)$`, "iu");

/** Whole-phrase snippet expansion; also the personal dictionary ("kill a dose" → "Kelados"). */
export function expandSnippets(text: string, snippets: Snippet[] = []) {
  return snippets.reduce((t, { trigger, text: out }) =>
    trigger.trim() ? t.replace(new RegExp(`(?<!\\w)${esc(trigger.trim())}(?!\\w)[.!]?`, "gi"), out) : t, text);
}

// Times ("6:00 p.m.") stay one token so they can be swapped as a unit.
const words = (s: string) => s.match(/\d{1,2}(?::\d{2})?\s?[ap]\.?m\.?|\S+/gi) ?? [];
const norm = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{M}\p{N}:]/gu, "");
const STOP = new Set("a an the to at on in of for and or but is it i we you he she they my our your this that with by from".split(" "));
const KINDS: [string, RegExp][] = [
  ["time", /^\d{1,2}(:\d{2})?([ap]m)?$|^(noon|midnight)$/],
  ["day", /^(mon|tues|wednes|thurs|fri|satur|sun)day$|^(today|tomorrow|tonight|yesterday)$/],
  ["month", /^(january|february|march|april|may|june|july|august|september|october|november|december)$/],
  ["number", /^\d+(\.\d+)?$/],
];
const kind = (w: string) => KINDS.find(([, re]) => re.test(norm(w)))?.[0];

/**
 * Where does the repair restart the clause? Finds the run of words the speaker repeated ("have a meet") and lines it up,
 * so "let's have a meet on Wednesday 6pm, no no, we can have a meet at 8pm on Friday" keeps only the second version.
 * Returns where in `p` the repair starts replacing (-1 if nowhere) and where the untouched tail resumes.
 */
function restartAt(p: string[], r: string[], maxJ = 3) {
  let best = { len: 0, j: 0, at: -1, tail: 0 };
  for (let j = 0; j < Math.min(maxJ, r.length); j++)
    for (let i = 0; i < p.length; i++) {
      let len = 0;
      while (i + len < p.length && j + len < r.length && norm(p[i + len]) === norm(r[j + len])) len++;
      if (!len) continue;
      const w = norm(p[i]);
      // One shared word is only an anchor if it means something, or if the repair starts with it ("…to John, no, to Sarah").
      if (len === 1 && (kind(w) || (STOP.has(w) && j > 0) || (!STOP.has(w) && w.length < 3))) continue;
      // Longest run wins; on a tie, the earliest start in the repair, then the occurrence nearest the marker.
      // A repair that ends on the shared words ("सात बजे" for "छह बजे") keeps what followed them (the verb, in Hindi).
      if (len > best.len || (len === best.len && j === best.j)) best = { len, j, at: Math.max(0, i - j), tail: j + len === r.length ? i + len : p.length };
    }
  return best;
}

function applySoftCorrection(text: string) {
  const m = text.match(SOFT);
  if (!m) return text;
  const split = m[1].match(/^([\s\S]*[.!?।]\s+)?([\s\S]*)$/)!;
  const p = words(split[2].replace(/[.,!?।]+$/, ""));
  const r = words(m[2].trim());
  const best = restartAt(p, r, 8);
  if (best.len < 2) return text; // not clearly a restatement
  return `${split[1] ?? ""}${[...p.slice(0, best.at), ...r, ...p.slice(best.tail)].join(" ")}`;
}

/**
 * Put a spoken fix into the words it corrects, or null when it's unclear what it replaces: either the repeated words
 * line up ("…to John" / "to Sarah"), or it's a day/time/number swapped for one of the same kind ("Friday" → "Saturday").
 */
export function alignFix(p: string[], r: string[]): string[] | null {
  const { at, tail } = restartAt(p, r);
  if (at >= 0) return [...p.slice(0, at), ...r, ...p.slice(tail)];
  const typed = r.filter((w) => !STOP.has(norm(w)));
  if (!typed.length || typed.length > 3 || !typed.every((w) => kind(w))) return null;
  const kept = [...p];
  for (const w of typed) {
    const i = kept.findLastIndex((x) => kind(x) === kind(w));
    if (i >= 0) kept[i] = w; else kept.push(w);
  }
  return kept;
}
export { words as splitWords };

function applyCorrection(text: string): string {
  const m = text.match(CORRECTION);
  if (!m || !m[1].trim() || !m[2].replace(/[\s.,!?।]/g, "")) return text;
  // The greedy prefix can keep the start of a longer marker ("Sorry," before "I meant"); drop it. Then only the
  // sentence right before the marker is being corrected.
  const before = m[1].replace(new RegExp(`(?:[\\s,.]*${B}(?:sorry|no|wait|oh|actually|नहीं)${E})+[\\s,.]*$`, "iu"), "");
  if (!before.trim()) return text;
  const split = before.trim().match(/^([\s\S]*[.!?।]\s+)?([\s\S]*)$/)!;
  const head = split[1] ?? "";
  const p = words(split[2].replace(/[.,!?।]+$/, ""));
  const end = m[2].trim().match(/[.!?।]$/)?.[0] ?? "";
  const r = words(m[2].trim().replace(/[.!?।]$/, ""));

  // ponytail: word-count fallback when nothing lines up, wrong when the fix is longer or shorter than what it replaces.
  const kept = alignFix(p, r) ?? [...p.slice(0, p.length - Math.min(r.length, p.length)), ...r];
  if (kept.length) kept[kept.length - 1] += end;
  // An earlier correction in the same phrase ("5, no wait, 6, no no, 7") is handled by recursing on the result.
  return applyCorrection(`${head}${kept.join(" ")}`);
}

// Spoken web addresses: "kelados dot in" → "kelados.in", "sam at example dot com" → "sam@example.com".
const TLD = "com|in|org|net|io|ai|co|dev|app|me|so|xyz|edu|gov|us|uk";
// "the dot com era" is speech, not an address, so ordinary words can't be the name.
const DOMAIN = new RegExp(`\\b(?!(?:the|a|an|this|that|and|or|of)\\b)([a-z0-9][a-z0-9-]*)(?:\\s+dot\\s+|\\.)(${TLD})\\b`, "gi");
const EMAIL = new RegExp(`\\b([a-z0-9][a-z0-9._-]*)\\s+at\\s+([a-z0-9-]+\\.(?:${TLD}))\\b`, "gi");
export const addresses = (text: string) =>
  text.replace(DOMAIN, (_, name, tld) => `${name}.${tld}`.toLowerCase()).replace(EMAIL, (_, user, host) => `${user}@${host}`.toLowerCase());

export function tidy(text: string) {
  // The speech model sometimes opens a quote it never closes; a lone quote mark is noise.
  if ((text.match(/"/g) ?? []).length % 2) text = text.replace(/"/g, "");
  return text
    .replace(/^[ \t,]+/, "") // not newlines: a phrase may start with "new paragraph" or "bullet point"
    .replace(/[ \t]+/g, " ")
    .replace(/ +([,.;:!?।])/g, "$1")
    .replace(/([.!?])[.,]+/g, "$1")
    .replace(/,([.!?])/g, "$1")
    .replace(/ *\n */g, "\n")
    .replace(/\bi\b(?!\.)/g, "I")
    // Days and months are names ("may" and "march" are ordinary words too, so they're left alone).
    .replace(/\b(?:mon|tues|wednes|thurs|fri|satur|sun)day\b|\b(?:january|february|april|june|july|august|september|october|november|december)\b/g, (w) => w[0].toUpperCase() + w.slice(1))
    .replace(/(^|(?<![ap]\.m)[.!?]\s+|\n-? ?)([a-z])/g, (_, p, c) => p + c.toUpperCase()) // "6 p.m. on" isn't a new sentence
    .replace(/[ ,]+$/, "");
}

export function cleanup(raw: string, { fillers = true, commands = true, snippets = [] }: CleanupOptions = {}): Cleaned {
  let text = raw.trim();
  let undoPrevious = false;

  if (commands) {
    const m = text.match(SCRATCH);
    if (m && m.index !== undefined) {
      const before = text.slice(0, m.index).trim();
      if (!before) undoPrevious = true;
      // Drop the last sentence before the command, keep anything said after it.
      const kept = before.replace(/(^|[.!?]\s+)[^.!?]*[.!?]?\s*$/, "$1").trim();
      text = `${kept} ${text.slice(m.index + m[0].length)}`.trim();
    }
    text = applySoftCorrection(applyCorrection(text));
  }
  if (fillers) {
    text = text.replace(FILLERS, "$1").replace(HINDI_FILLERS, "");
    // Stutters: "the the" → "the". "that that" and "had had" are real English, so they stay.
    text = text.replace(/\b(\w+)(?:[\s,]+\1\b)+/gi, (m, w) => (/^(that|had|is)$/i.test(w) ? m : w));
  }
  text = expandSnippets(text, snippets);
  if (commands) text = addresses(text);
  if (commands && !LIST_EDIT.test(text.trim())) for (const [re, out] of [...COMMANDS, ...HINDI_COMMANDS]) text = text.replace(re, out);
  return { text: tidy(text), undoPrevious };
}

/** Join a new dictated piece onto what is already there with sensible spacing. */
export function joinText(prev: string, next: string) {
  if (!prev || !next) return prev + next;
  if (/^[\n,.;:!?]/.test(next) || /[\n]$/.test(prev) || /- $/.test(prev)) return prev + next;
  return `${prev} ${next}`;
}

export type KeyName = "enter" | "tab" | "backspace" | "selectAll" | "copy" | "paste";
// Said on its own (a whole phrase), these press a key in the app you're using instead of typing words.
const KEYS: [RegExp, KeyName][] = [
  [/^(?:press )?(?:enter|return)|^send(?: it| that| the message)?|^भेजो|^भेज दो/, "enter"],
  [/^(?:press )?tab/, "tab"],
  [/^(?:press )?backspace|^delete (?:the )?last word/, "backspace"],
  [/^select all/, "selectAll"],
  [/^copy (?:that|it|this)/, "copy"],
  [/^paste(?: that| it)?/, "paste"],
];

/** The key a whole spoken phrase asks for ("Press enter." → "enter"), or null when it's just text. */
export function keyCommand(text: string): KeyName | null {
  const t = text.trim().toLowerCase().replace(/[.!?।,]+$/, "");
  return KEYS.find(([re]) => new RegExp(`^(?:${re.source})$`, "u").test(t))?.[1] ?? null;
}

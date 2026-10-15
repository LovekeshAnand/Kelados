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

// "scratch that" at the start undoes the previous dictation; mid-text it drops the sentence before it.
const SCRATCH = /\b(?:scratch|delete|undo) that\b[.!,]?/i;

// "at 4pm, no wait, 5pm" → "at 5pm". Replaces as many trailing words as the correction has.
// ponytail: word-count heuristic, wrong when the correction is longer or shorter than what it fixes.
const CORRECTION = /^(.*?)[\s,.]*\b(?:no,? wait|sorry,? I meant?|correction)\b[\s,.:]*(.+)$/i;

/** Whole-phrase snippet expansion; also the personal dictionary ("kill a dose" → "Kelados"). */
export function expandSnippets(text: string, snippets: Snippet[] = []) {
  return snippets.reduce((t, { trigger, text: out }) =>
    trigger.trim() ? t.replace(new RegExp(`(?<!\\w)${esc(trigger.trim())}(?!\\w)[.!]?`, "gi"), out) : t, text);
}

function applyCorrection(text: string) {
  const m = text.match(CORRECTION);
  if (!m || !m[1].trim()) return text;
  const fix = m[2].trim();
  const before = m[1].trim().split(/\s+/);
  const n = Math.min(fix.replace(/[.!?]$/, "").split(/\s+/).length, before.length);
  return [...before.slice(0, before.length - n), fix].join(" ");
}

export function tidy(text: string) {
  return text
    .replace(/^[ \t,]+/, "") // not newlines: a phrase may start with "new paragraph" or "bullet point"
    .replace(/[ \t]+/g, " ")
    .replace(/ +([,.;:!?])/g, "$1")
    .replace(/([.!?])[.,]+/g, "$1")
    .replace(/,([.!?])/g, "$1")
    .replace(/ *\n */g, "\n")
    .replace(/\bi\b(?!\.)/g, "I")
    .replace(/(^|[.!?]\s+|\n-? ?)([a-z])/g, (_, p, c) => p + c.toUpperCase())
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
    text = applyCorrection(text);
  }
  if (fillers) {
    text = text.replace(FILLERS, "$1");
    // Stutters: "the the" → "the". "that that" and "had had" are real English, so they stay.
    text = text.replace(/\b(\w+)(?:[\s,]+\1\b)+/gi, (m, w) => (/^(that|had|is)$/i.test(w) ? m : w));
  }
  text = expandSnippets(text, snippets);
  if (commands) for (const [re, out] of COMMANDS) text = text.replace(re, out);
  return { text: tidy(text), undoPrevious };
}

/** Join a new dictated piece onto what is already there with sensible spacing. */
export function joinText(prev: string, next: string) {
  if (!prev || !next) return prev + next;
  if (/^[\n,.;:!?]/.test(next) || /[\n]$/.test(prev) || /- $/.test(prev)) return prev + next;
  return `${prev} ${next}`;
}

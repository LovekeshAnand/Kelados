// Editing text Kelados already typed, by voice. Given what this session typed (one string per phrase) and the newest
// cleaned phrase, decide whether that phrase is an edit and what the affected phrases should now say.
import { alignFix, LIST_EDIT as LIST, splitWords } from "./cleanup.ts"; // .ts so node --test can load it too

/** Phrases from `from` onward should become `text` (replacing them in the app); null means "just type it". */
export type VoiceEdit = { from: number; text: string; label: string };

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const strip = (s: string) => s.trim().replace(/[.!?।]+$/, "");
const lead = (s: string) => s.match(/^\s*/)![0]; // a phrase's leading space or newline, kept when it's rewritten

// "change Friday to Saturday", "replace coffee with tea"
const REPLACE = /^(?:change|replace)\s+(.+?)\s+(?:to|with|by)\s+(.+?)[.!]?$/i;
// A phrase that opens by taking back the last one: "No no, make it Saturday", "Actually, 9 p.m.", "I meant Monday".
// Cleanup has already collapsed "no no" to "No", so a bare "No," counts; alignFix still has to find what it replaces.
const FIX = /^(?:(?:no|nope|oh|wait|sorry)[,.!]?\s+)*(?:make\s+(?:it|that)|change\s+(?:it|that)\s+to|I\s+meant?|actually|no|nope|wait|sorry|नहीं|nahi)?(?=[\s,:.]|$)[\s,:.]*(.+)$/iu;

/** "Shopping list: eggs, milk and coffee." → "Shopping list:\n- Eggs\n- Milk\n- Coffee" (null if it isn't a list). */
export function bulletize(text: string) {
  const t = strip(text);
  const colon = t.indexOf(":");
  const head = colon > 0 ? t.slice(0, colon).trim() : "";
  const items = (colon > 0 ? t.slice(colon + 1) : t).split(/\s*,\s*(?:and\s+)?|\s+and\s+/i).map((s) => s.trim()).filter(Boolean);
  if (items.length < 2) return null;
  return (head ? `${head}:\n` : "") + items.map((i) => `- ${cap(i)}`).join("\n");
}

export function voiceEdit(pieces: string[], said: string): VoiceEdit | null {
  if (!pieces.length) return null;
  const last = pieces.length - 1;
  const phrase = said.trim();

  if (LIST.test(phrase)) {
    const text = bulletize(pieces[last]);
    // A list after other text starts on its own line.
    return text ? { from: last, text: (last ? "\n" : lead(pieces[last])) + text, label: "Made a list" } : null;
  }

  const rep = phrase.match(REPLACE);
  if (rep) {
    const [find, put] = [strip(rep[1]), strip(rep[2])];
    // The newest phrase that contains it; everything typed after it is retyped too, unchanged.
    for (let i = last; i >= 0; i--) {
      const at = pieces[i].toLowerCase().lastIndexOf(find.toLowerCase());
      if (at < 0) continue;
      const fixed = pieces[i].slice(0, at) + (/^[A-Z]/.test(pieces[i].slice(at)) ? cap(put) : put) + pieces[i].slice(at + find.length);
      return { from: i, text: [fixed, ...pieces.slice(i + 1)].join(""), label: `Changed “${find}” to “${put}”` };
    }
    return null;
  }

  const fix = /^(?:no|nope|oh|wait|sorry|make|change|I\s+meant?|actually|नहीं|nahi)(?=[\s,:.!]|$)/iu.test(phrase) && phrase.match(FIX);
  if (fix) {
    const prev = pieces[last];
    const end = prev.trim().match(/[.!?।]$/)?.[0] ?? "";
    // Only the last sentence of the last phrase is in play; the rest is kept as typed.
    const split = prev.match(/^([\s\S]*[.!?।]\s+)?([\s\S]*)$/)!;
    const kept = alignFix(splitWords(strip(split[2])), splitWords(strip(fix[1])));
    if (!kept) return null; // not clearly a correction of what's on screen: type it as said
    kept[0] = cap(kept[0]); // the rewritten sentence still starts a sentence
    return { from: last, text: lead(prev) + `${(split[1] ?? "").trimStart()}${kept.join(" ")}${end}`, label: "Corrected" };
  }
  return null;
}

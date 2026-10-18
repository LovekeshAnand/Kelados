// Learns how you write, on this device, from what you've dictated: the names, brands and jargon you use and the
// words that usually follow each other. Then it quietly fixes what the speech model mishears ("pria" → "Priya",
// "kelado" → "Kelados") with nothing to press. A word n-gram table, not a language model: trains in milliseconds.

// Everyday phrasing, so common words are known from day one and never "corrected" into one of your names.
const SEED = `let me know if you have any questions
let me know what you think
let me know if that works for you
looking forward to hearing from you
looking forward to it
thank you so much for your help
thanks for getting back to me
thanks for the update
I hope you are doing well
I hope this helps
please find attached the
please let me know if you need anything else
can we schedule a meeting for
can we have a meeting on
let's have a meeting on
let's catch up tomorrow
let's discuss this in the meeting
I will get back to you by
I will send it over by
I'll send you the details
I'll keep you posted
sorry for the late reply
sorry for the delay
have a great day
have a great weekend
talk to you soon
see you tomorrow
see you at the meeting
on the same page
as soon as possible
at the end of the day
in the meantime
for your reference
could you please send me the
could you please take a look
would you be available for a quick call
I wanted to follow up on
just wanted to check in
just a quick reminder that
what do you think about
how does that sound
that sounds good to me
that works for me
no worries at all
happy to help
please review and let me know
best regards
kind regards`;

export type Model = {
  /** What follows each word, counted from your own dictations. */
  next: Map<string, Map<string, number>>;
  /** Your spelling of words you capitalise mid-sentence ("Priya", "iPhone") and how often. */
  cased: Map<string, { word: string; n: number }>;
  /** Every word you (or the seed) have written, lowercased. */
  seen: Set<string>;
  /** Words you've also written in lowercase mid-sentence, so "May" never forces "may" to change. */
  lower: Set<string>;
};

const toks = (s: string) => s.replace(/[^\p{L}\p{M}\p{N}'\s-]/gu, " ").split(/\s+/).filter(Boolean);
// Words that are both names and ordinary words; never recased.
// ponytail: hand-picked list; a proper English wordlist would catch more, at ~1 MB.
const AMBIGUOUS = new Set("may march august june april will mark bill rose pat sue grace hope faith joy frank jack ray dean rich art bob sunny".split(" "));

export function train(texts: string[]): Model {
  const m: Model = { next: new Map(), cased: new Map(), seen: new Set(), lower: new Set() };
  for (const w of toks(SEED.toLowerCase())) m.seen.add(w);
  for (const text of texts)
    for (const sentence of text.split(/[.!?।\n]+/)) {
      const t = toks(sentence);
      t.forEach((w, i) => {
        const lc = w.toLowerCase();
        m.seen.add(lc);
        if (i === 0) return; // a sentence's first word is capitalised anyway
        if (w === lc) m.lower.add(lc);
        else if (/\p{L}/u.test(w)) m.cased.set(lc, { word: w, n: (m.cased.get(lc)?.n ?? 0) + 1 });
        const nx = m.next.get(t[i - 1].toLowerCase()) ?? new Map<string, number>();
        nx.set(lc, (nx.get(lc) ?? 0) + 1);
        m.next.set(t[i - 1].toLowerCase(), nx);
      });
    }
  return m;
}

/** Edit distance, capped: returns limit + 1 as soon as it's exceeded. */
function distance(a: string, b: string, limit: number) {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    if (Math.min(...cur) > limit) return limit + 1;
    prev = cur;
  }
  return prev[b.length];
}

/** A word you've never written that is one letter off (two for long words) a name you use, or the word you usually say next. */
function closest(m: Model, lc: string, prev: string) {
  const limit = lc.length >= 7 ? 2 : 1;
  let best = "", score = 0;
  const consider = (cand: string, n: number, spelled: string) => {
    if (n > score && cand !== lc && distance(lc, cand, limit) <= limit) { best = spelled; score = n; }
  };
  for (const [cand, { word, n }] of m.cased) if (n >= 3 && !m.lower.has(cand)) consider(cand, n, word);
  for (const [cand, n] of m.next.get(prev) ?? []) if (n >= 3) consider(cand, n, m.cased.get(cand)?.word ?? cand);
  return best;
}

/** Apply what's been learned to a freshly dictated phrase. */
export function personalize(m: Model, text: string) {
  let prev = "";
  return text.replace(/[\p{L}\p{M}\p{N}'-]+/gu, (w) => {
    const lc = w.toLowerCase();
    const before = prev;
    prev = lc;
    const known = m.cased.get(lc);
    if (known && known.n >= 2 && !m.lower.has(lc) && !AMBIGUOUS.has(lc) && known.word !== w) return known.word;
    if (lc.length >= 4 && !m.seen.has(lc) && !/\d/.test(lc)) return closest(m, lc, before) || w;
    return w;
  });
}

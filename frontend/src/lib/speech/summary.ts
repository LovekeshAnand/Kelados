// Meeting summaries without a language model: extractive highlights plus pattern-matched
// action items, decisions and open questions. Instant, offline, and it never makes things up.

export type Summary = { highlights: string[]; actions: string[]; decisions: string[]; questions: string[]; keywords: string[] };

const STOP = new Set(("a an the and or but if then so of to in on at by for with from as is are was were be been being it its this that " +
  "these those i you he she we they me him her us them my your our their do does did done have has had not no yes just " +
  "like really very can could would should will shall may might must about into over than too also there here what which " +
  "who when where why how all any some more most other such only own same up down out off again once okay yeah um uh " +
  "gonna wanna get got go going know think mean right well thing things kind sort lot").split(" "));

const ACTION = /\b(I'll|I will|we'll|we will|you'll|need to|needs to|have to|has to|let's|going to|action item|to-?do|follow[- ]up|remind|send|schedule|by (?:monday|tuesday|wednesday|thursday|friday|tomorrow|next week|end of (?:day|week)|eod))\b/i;
const DECISION = /\b(decided|decision|agreed|agree on|we'll go with|going with|settled on|approved|final answer|let's go with)\b/i;

export function sentences(text: string) {
  // Line breaks end a sentence too: list items and headings in dictated notes have no full stop.
  return text.split(/\n+/).flatMap((line) => line.replace(/\s+/g, " ").match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [])
    .map((s) => s.trim().replace(/^-\s*/, "")).filter((s) => s.split(" ").length >= 3);
}

const words = (s: string) => s.toLowerCase().match(/[a-z][a-z'-]+/g)?.filter((w) => w.length > 2 && !STOP.has(w)) ?? [];

export function summarize(text: string, maxHighlights = 5): Summary {
  const all = sentences(text);
  const freq = new Map<string, number>();
  for (const w of words(text)) freq.set(w, (freq.get(w) ?? 0) + 1);

  // Sentence score: average frequency of its content words; long rambles don't win by length alone.
  const scored = all.map((s, i) => {
    const ws = words(s);
    return { s, i, score: ws.length ? ws.reduce((n, w) => n + (freq.get(w) ?? 0), 0) / Math.sqrt(ws.length) : 0 };
  });
  const n = Math.min(maxHighlights, Math.max(1, Math.round(all.length / 6)));
  const highlights = [...scored].sort((a, b) => b.score - a.score).slice(0, n).sort((a, b) => a.i - b.i).map((x) => x.s);

  const uniq = (xs: string[]) => [...new Set(xs)];
  return {
    highlights,
    actions: uniq(all.filter((s) => ACTION.test(s) && !s.endsWith("?"))),
    decisions: uniq(all.filter((s) => DECISION.test(s))),
    questions: uniq(all.filter((s) => s.endsWith("?") && s.split(" ").length >= 4)),
    keywords: [...freq].filter(([, c]) => c > 1).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([w]) => w),
  };
}

import { test } from "node:test";
import assert from "node:assert/strict";
import { sentences, summarize } from "../src/lib/speech/summary.ts";

const meeting = `Okay let's get started. The launch of the desktop app is the main topic today.
We decided to ship the desktop app on Friday. Priya will send the release notes by Thursday.
Does anyone know if the Windows installer is signed yet? The installer signing is still pending.
I'll follow up with the signing vendor tomorrow. The desktop app launch blog post needs review.
The weather was nice this weekend.`;

test("summary pulls actions, decisions, questions and on-topic highlights", () => {
  const s = summarize(meeting);
  assert.deepEqual(s.decisions, ["We decided to ship the desktop app on Friday."]);
  assert.ok(s.actions.includes("Priya will send the release notes by Thursday."));
  assert.ok(s.actions.includes("I'll follow up with the signing vendor tomorrow."));
  assert.deepEqual(s.questions, ["Does anyone know if the Windows installer is signed yet?"]);
  assert.ok(s.keywords.includes("desktop"));
  assert.ok(!s.highlights.some((h) => h.includes("weather")));
});

test("line breaks split sentences in dictated notes", () => {
  const s = summarize("Shopping list\n- Eggs\n- Milk\n\nI need to call the bank tomorrow.");
  assert.deepEqual(s.actions, ["I need to call the bank tomorrow."]);
});

test("sentences drop fragments and empty input is safe", () => {
  assert.deepEqual(sentences("Yes. Ok sure. That works for me."), ["That works for me."]);
  assert.deepEqual(summarize("").highlights, []);
});

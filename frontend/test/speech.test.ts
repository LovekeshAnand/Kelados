// Run with: npm test (node --test, Node 22.18+ strips the types itself).
import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanup, joinText } from "../src/lib/speech/cleanup.ts";
import { createVad, downsample, isHallucination, splitAtSilence, RATE, type Segment } from "../src/lib/speech/vad.ts";

const c = (s: string, o = {}) => cleanup(s, o).text;

test("fillers and stutters go, real repeats stay", () => {
  assert.equal(c("Um, so I think, uh, we should go."), "So I think, we should go.");
  assert.equal(c("I went to the the store."), "I went to the store.");
  assert.equal(c("I know that that is true."), "I know that that is true.");
  assert.equal(c("Visit kelados.com today."), "Visit kelados.com today.");
});

test("spoken commands", () => {
  assert.equal(c("Dear Sam, new line. Thanks for the notes."), "Dear Sam\nThanks for the notes.");
  assert.equal(c("Is this working question mark"), "Is this working?");
  assert.equal(c("Shopping list bullet point eggs bullet point milk"), "Shopping list\n- Eggs\n- Milk");
  assert.equal(c("It took a period of time to finish period"), "It took a period of time to finish.");
  assert.equal(c("First paragraph. New paragraph. Second one."), "First paragraph\n\nSecond one.");
});

test("corrections and scratch that", () => {
  assert.equal(c("Let's meet at 4pm, no wait, 5pm."), "Let's meet at 5pm.");
  assert.equal(c("Send it to Paris. Sorry, I meant London."), "Send it to London.");
  assert.deepEqual(cleanup("Scratch that."), { text: "", undoPrevious: true });
  assert.equal(c("This is wrong. Scratch that. This is right."), "This is right.");
});

test("snippets and personal dictionary", () => {
  const snippets = [{ trigger: "my email", text: "sam@example.com" }, { trigger: "kill a dose", text: "Kelados" }];
  assert.equal(c("Write to my email.", { snippets }), "Write to sam@example.com");
  assert.equal(c("I love kill a dose.", { snippets }), "I love Kelados");
});

test("joinText spacing", () => {
  assert.equal(joinText("Hello.", "World."), "Hello. World.");
  assert.equal(joinText("Hello", "\n- Item"), "Hello\n- Item");
  assert.equal(joinText("", "Hi"), "Hi");
});

const tone = (s: number, amp: number) => Float32Array.from({ length: s * RATE }, (_, i) => amp * Math.sin(i / 8));

test("vad cuts speech at silence and keeps preroll", () => {
  const segs: Segment[] = [];
  const vad = createVad({ partialMs: 0 }, { onSegment: (s) => segs.push(s) });
  for (const chunk of [tone(1, 0), tone(1.5, 0.3), tone(1, 0), tone(0.8, 0.3), tone(1, 0)]) vad.push(chunk);
  vad.flush();
  assert.equal(segs.length, 2);
  assert.ok(Math.abs(segs[0].start - 0.7) < 0.05, `start ${segs[0].start}`);
  assert.ok(segs[0].end > 2.5 && segs[0].end < 2.8, `end ${segs[0].end}`);
  assert.ok(segs[1].start > 3.1 && segs[1].start < 3.5);
});

test("vad ignores clicks and force-cuts monologues", () => {
  const segs: Segment[] = [];
  const vad = createVad({ partialMs: 0, maxMs: 5000 }, { onSegment: (s) => segs.push(s) });
  vad.push(tone(1, 0)); vad.push(tone(0.1, 0.5)); vad.push(tone(1, 0));
  assert.equal(segs.length, 0);
  vad.push(tone(12, 0.3)); vad.flush();
  assert.ok(segs.length >= 2 && segs.every((s) => s.end - s.start <= 5.4));
});

test("splitAtSilence cuts at the quiet spot under the limit", () => {
  const a = new Float32Array(70 * RATE).fill(0.2);
  a.fill(0, 22 * RATE, 22.5 * RATE);
  const parts = splitAtSilence(a);
  assert.ok(parts[1].start >= 22 && parts[1].start <= 22.5, `cut at ${parts[1].start}`);
  assert.equal(parts.reduce((n, p) => n + p.audio.length, 0), a.length);
  assert.ok(parts.every((p) => p.audio.length <= 28 * RATE));
});

test("downsample and hallucination filter", () => {
  assert.equal(downsample(new Float32Array(48000), 48000).length, 16000);
  assert.ok(isHallucination("[BLANK_AUDIO]", 3));
  assert.ok(isHallucination(" you", 1));
  assert.ok(!isHallucination("Thank you.", 1));
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { addLine, isEcho } from "../src/lib/notes.ts";

const line = (speaker: string, text: string, start: number) => ({ id: `${speaker}${start}`, speaker, text, start, end: start + 2 });

test("echoes are detected across sources only, close in time", () => {
  assert.ok(isEcho(line("Others", "We decided to ship on Friday.", 2), line("You", "We decided to ship the app Friday", 2.6)));
  assert.ok(!isEcho(line("Others", "We decided to ship on Friday.", 2), line("Others", "We decided to ship on Friday.", 2)));
  assert.ok(!isEcho(line("Others", "We decided to ship on Friday.", 2), line("You", "We decided to ship on Friday.", 9)));
  assert.ok(!isEcho(line("Others", "Can you hear me?", 2), line("You", "Yes, loud and clear.", 3)));
});

test("the meeting-audio copy wins whichever arrives first", () => {
  const call = line("Others", "Priya will send the release notes.", 5);
  const mic = line("You", "Priya will send the release notes", 5.4);
  assert.deepEqual(addLine([call], mic).map((l) => l.speaker), ["Others"]);
  assert.deepEqual(addLine([mic], call).map((l) => l.speaker), ["Others"]);
  const reply = line("You", "Sounds good to me.", 8);
  assert.deepEqual(addLine([call], reply).map((l) => l.text), [call.text, reply.text]);
});

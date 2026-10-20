// Run with: npm test (node --test, Node 22.18+ strips the types itself).
import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanup, joinText, keyCommand } from "../src/lib/speech/cleanup.ts";
import { personalize, train } from "../src/lib/speech/learn.ts";
import { bulletize, voiceEdit } from "../src/lib/speech/edit.ts";
import { diffWords, refine, toBullets, toEmail, toNumbered, toParagraph } from "../src/lib/speech/format.ts";
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

test("a phrase may start with a layout command", () => {
  assert.equal(c("New paragraph. I need to call the bank."), "\n\nI need to call the bank.");
  assert.equal(c("Bullet point milk."), "\n- Milk.");
  assert.equal(joinText("- Eggs", c("New paragraph. Next.")), "- Eggs\n\nNext.");
});

test("corrections and scratch that", () => {
  assert.equal(c("Let's meet at 4pm, no wait, 5pm."), "Let's meet at 5pm.");
  assert.equal(c("Send it to Paris. Sorry, I meant London."), "Send it to London.");
  assert.deepEqual(cleanup("Scratch that."), { text: "", undoPrevious: true });
  assert.equal(c("This is wrong. Scratch that. This is right."), "This is right.");
});

test("self-corrections line up with what they replace", () => {
  assert.equal(c("Let's have a meet on Wednesday 6:00 p.m. No, no, we can have a meet at 8:00 p.m. on Friday."), "We can have a meet at 8:00 p.m. on Friday.");
  assert.equal(c("Book the table for Wednesday at 7pm, no wait, Friday."), "Book the table for Friday at 7pm.");
  assert.equal(c("Send it to John, no wait, to Sarah."), "Send it to Sarah.");
  assert.equal(c("I'll meet you at the office, no no, at the cafe."), "I'll meet you at the cafe.");
  assert.equal(c("We need 20 chairs, actually no, 25."), "We need 25 chairs.");
  assert.equal(c("Call me at 5, no wait, 6, no no, 7."), "Call me at 7.");
  assert.equal(c("No, no, that's totally fine."), "No, that's totally fine.");
});

test("Hindi commands, fillers and corrections", () => {
  assert.equal(c("कल शाम छह बजे मिलते हैं नहीं नहीं सात बजे"), "कल शाम सात बजे मिलते हैं");
  assert.equal(c("नमस्ते दोस्तों नई लाइन आज की मीटिंग पूर्ण विराम"), "नमस्ते दोस्तों\nआज की मीटिंग।");
  assert.equal(c("उम्म मैं कल आऊंगा"), "मैं कल आऊंगा");
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
  assert.ok(Math.abs(segs[0].start - 0.5) < 0.05, `start ${segs[0].start}`); // 0.5 s preroll before speech at 1 s
  assert.ok(segs[0].end > 2.5 && segs[0].end < 3.2, `end ${segs[0].end}`); // speech ends at 2.5 s, quiet tail kept
  assert.ok(segs[1].start > 2.9 && segs[1].start < 3.5);
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

test("learns your names and terms, and fixes near misses", () => {
  const m = train(["I met Priya today", "Then Priya said hi", "Ask Priya about Kelados", "We love Kelados", "We use Kelados daily", "See you in May", "See you in May again"]);
  assert.equal(personalize(m, "i talked to pria about kelados"), "i talked to Priya about Kelados");
  assert.equal(personalize(m, "Kelado is ready"), "Kelados is ready");
  assert.equal(personalize(m, "you may go"), "you may go"); // a name that's also a word stays
  assert.equal(personalize(m, "let me know"), "let me know"); // common words are never "fixed"
  assert.equal(personalize(train([]), "hello prya"), "hello prya"); // nothing learned, nothing changed
});

test("whole-phrase key commands", () => {
  assert.equal(keyCommand("Press enter."), "enter");
  assert.equal(keyCommand("Send it."), "enter");
  assert.equal(keyCommand("Select all"), "selectAll");
  assert.equal(keyCommand("भेजो।"), "enter");
  assert.equal(keyCommand("Send it to Sarah tomorrow."), null);
  assert.equal(keyCommand("Copy that file to the drive."), null);
});

test("a plain 'No,' corrects only when it restates the sentence before", () => {
  assert.equal(c("Let's schedule a meeting for Friday at 9 p.m. No, we can schedule the meeting for Wednesday at 8 p.m."), "We can schedule the meeting for Wednesday at 8 p.m.");
  assert.equal(c("Can you come tomorrow? No, I think that's fine."), "Can you come tomorrow? No, I think that's fine.");
});

test("days and months are capitalised, ordinary words are not", () => {
  assert.equal(c("so let's meet on friday at 9 pm no wait wednesday at 8 pm"), "So let's meet on Wednesday at 8 pm");
  assert.equal(c("you may march on in june"), "You may march on in June");
});

test("editing text that's already been typed", () => {
  const typed = ["Let's have a meet on Friday at 8 p.m."];
  const fix = (said: string, pieces = typed) => voiceEdit(pieces, c(said));
  assert.deepEqual(fix("No no, make it Saturday."), { from: 0, text: "Let's have a meet on Saturday at 8 p.m.", label: "Corrected" });
  assert.equal(fix("Actually, 9 p.m.")?.text, "Let's have a meet on Friday at 9 p.m.");
  assert.equal(fix("No, we can have the meet on Monday at 10 a.m.")?.text, "We can have the meet on Monday at 10 a.m.");
  assert.equal(fix("Change Friday to Sunday.")?.text, "Let's have a meet on Sunday at 8 p.m.");
  // Not edits: ordinary sentences that happen to start the same way are typed as said.
  assert.equal(fix("Actually, I also need the slides."), null);
  assert.equal(fix("No, I can't make it."), null);
  assert.equal(fix("Make sure you bring the laptop."), null);
  assert.equal(fix("Change is good."), null);
  // Later phrases are retyped unchanged when an earlier one is edited; leading spaces survive.
  assert.deepEqual(voiceEdit(["Buy coffee.", " Call Sam."], "Change coffee to tea."), { from: 0, text: "Buy tea. Call Sam.", label: "Changed “coffee” to “tea”" });
  assert.equal(voiceEdit(["Hi.", " Order eggs, milk and coffee."], "Make that a bullet list.")?.text, "\n- Order eggs\n- Milk\n- Coffee");
});

test("bullet lists", () => {
  assert.equal(bulletize("Shopping list: eggs, milk and coffee."), "Shopping list:\n- Eggs\n- Milk\n- Coffee");
  assert.equal(bulletize("eggs, milk, bread, and butter"), "- Eggs\n- Milk\n- Bread\n- Butter");
  assert.equal(bulletize("Just one thing."), null);
  // The spoken edit survives cleanup's own "bullet point" command.
  assert.equal(c("Make that a bullet list."), "Make that a bullet list.");
  assert.equal(voiceEdit(["Order eggs, milk, and coffee."], c("Make that a bullet list."))?.text, "- Order eggs\n- Milk\n- Coffee");
});

test("spoken addresses and stray quotes", () => {
  assert.equal(c("Email me at Sam at example dot com or visit kelados dot in."), "Email me at sam@example.com or visit kelados.in.");
  assert.equal(c("Visit example.com today."), "Visit example.com today.");
  assert.equal(c("Back in the dot com era."), "Back in the dot com era.");
  assert.equal(c("I'll meet you at the office."), "I'll meet you at the office.");
  assert.equal(c('He said "hello" to me.'), 'He said "hello" to me.');
  assert.equal(c('"Hey Priya, can you send it?'), "Hey Priya, can you send it?");
});

test("radial menu formats", () => {
  assert.equal(toBullets("Order eggs, milk and coffee."), "- Order eggs\n- Milk\n- Coffee");
  assert.equal(toBullets("Call Sam about the deck. Book the room. Send the invite."), "- Call Sam about the deck.\n- Book the room.\n- Send the invite.");
  assert.equal(toNumbered("- Eggs\n- Milk"), "1. Eggs\n2. Milk");
  assert.equal(toNumbered("Shopping list: eggs, milk and coffee."), "Shopping list:\n1. Eggs\n2. Milk\n3. Coffee");
  assert.equal(toParagraph("- Eggs\n- Milk\n- Coffee"), "Eggs. Milk. Coffee.");
  assert.equal(toEmail("can we meet friday"), "Hi,\n\ncan we meet friday.\n\nThanks,");
  assert.equal(refine("um so i think the the launch went well"), "I think the launch went well.");
  assert.equal(refine("- uh eggs\n- milk"), "- Eggs\n- Milk");
  assert.equal(refine("Hi"), "Hi");
});

test("refine tightens speech into writing without inventing words", () => {
  assert.equal(refine("Okay so basically we are gonna ship the update on friday, and then we will email the beta testers in order to get feedback."),
    "We are going to ship the update on Friday. Then we will email the beta testers to get feedback.");
  assert.equal(refine("I think the launch went really very well and honestly the team was able to fix most of the bugs."),
    "I think the launch went very well and the team could fix most of the bugs.");
  assert.equal(refine("I like this design."), "I like this design.");
  assert.equal(refine("It was, like, huge."), "It was huge.");
  assert.equal(refine("Hey Priya, can you send me the deck?"), "Hey Priya, can you send me the deck?");
});

test("word diff for suggestions", () => {
  const a = "we are gonna ship it", b = "We are going to ship it";
  const d = diffWords(a, b);
  assert.equal(d.filter((p) => p.kind !== "add").map((p) => p.text).join(""), a); // removing the additions gives the original
  assert.equal(d.filter((p) => p.kind !== "del").map((p) => p.text).join(""), b); // removing the deletions gives the suggestion
  assert.deepEqual(d.filter((p) => p.kind === "del").map((p) => p.text.trim()), ["we", "gonna"]);
});

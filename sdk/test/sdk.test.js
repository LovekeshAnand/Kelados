import { test } from "node:test";
import assert from "node:assert/strict";
import { applyLexicon, encodeWav } from "../src/index.js";

test("lexicon replaces whole words case-insensitively and escapes regex chars", () => {
  const rules = [{ from: "Kelados", to: "keh-lah-dos" }, { from: "C++", to: "C plus plus" }];
  assert.equal(applyLexicon("kelados loves C++ not Keladosian", rules), "keh-lah-dos loves C plus plus not Keladosian");
  assert.equal(applyLexicon("SQL", [{ from: "sql", to: "sequel" }]), "sequel");
});

test("wav header and clipping", () => {
  const wav = encodeWav(new Float32Array([0, 2, -2]), 24000);
  assert.equal(wav.toString("ascii", 0, 4), "RIFF");
  assert.equal(wav.readUInt32LE(24), 24000);
  assert.equal(wav.length, 44 + 6);
  assert.equal(wav.readInt16LE(46), 32767);
  assert.equal(wav.readInt16LE(48), -32767);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { keystroke } from "../keys.js";

test("each platform gets its own paste and undo keystroke", () => {
  assert.equal(keystroke("win32", "paste"), '[System.Windows.Forms.SendKeys]::SendWait("^v")');
  assert.deepEqual(keystroke("darwin", "undo"), ["osascript", ["-e", 'tell application "System Events" to keystroke "z" using command down']]);
  assert.deepEqual(keystroke("linux", "paste"), ["xdotool", ["key", "--clearmodifiers", "ctrl+v"]]);
  assert.throws(() => keystroke("aix", "paste"));
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { backspaces, keystroke } from "../keys.js";

test("each platform gets its own paste and undo keystroke", () => {
  assert.equal(keystroke("win32", "paste"), '[System.Windows.Forms.SendKeys]::SendWait("^v")');
  assert.deepEqual(keystroke("darwin", "undo"), ["osascript", ["-e", 'tell application "System Events" to keystroke "z" using command down']]);
  assert.deepEqual(keystroke("linux", "paste"), ["xdotool", ["key", "--clearmodifiers", "ctrl+v"]]);
  assert.equal(keystroke("win32", "enter"), '[System.Windows.Forms.SendKeys]::SendWait("{ENTER}")');
  assert.deepEqual(keystroke("darwin", "enter"), ["osascript", ["-e", 'tell application "System Events" to key code 36']]);
  assert.equal(backspaces("win32", 12), '[System.Windows.Forms.SendKeys]::SendWait("{BACKSPACE 12}")');
  assert.deepEqual(backspaces("linux", 3), ["xdotool", ["key", "--clearmodifiers", "--repeat", "3", "--delay", "2", "BackSpace"]]);
  assert.throws(() => keystroke("aix", "paste"));
});

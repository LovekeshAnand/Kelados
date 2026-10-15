// Typing into other apps without native modules: put the text on the clipboard and press the OS paste shortcut
// with the platform's own automation tool. The previous clipboard is restored afterwards.
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);
let ps = null; // one long-lived PowerShell on Windows: ~5 ms per keystroke instead of ~400 ms per spawn

const COMBOS = {
  win32: { paste: "^v", undo: "^z" },
  darwin: { paste: "v", undo: "z" },
  linux: { paste: "ctrl+v", undo: "ctrl+z" },
};

/** The command that presses `combo` on this platform (exported for tests). */
export function keystroke(platform, combo) {
  const k = COMBOS[platform]?.[combo];
  if (!k) throw new Error(`Unsupported: ${platform} ${combo}`);
  if (platform === "win32") return `[System.Windows.Forms.SendKeys]::SendWait("${k}")`;
  if (platform === "darwin") return ["osascript", ["-e", `tell application "System Events" to keystroke "${k}" using command down`]];
  // ponytail: terminals on Linux paste with ctrl+shift+v; detect the focused window class if that matters.
  return ["xdotool", ["key", "--clearmodifiers", k]];
}

export async function press(combo) {
  const cmd = keystroke(process.platform, combo);
  if (process.platform === "win32") {
    if (!ps) {
      ps = spawn("powershell", ["-NoProfile", "-NoLogo", "-Command", "-"], { stdio: ["pipe", "pipe", "ignore"], windowsHide: true });
      ps.acks = [];
      ps.stdout.setEncoding("utf8").on("data", (d) => { for (const _ of d.match(/ok/g) ?? []) ps?.acks.shift()?.(); });
      ps.on("exit", () => { ps?.acks.forEach((r) => r()); ps = null; });
      ps.stdin.write("Add-Type -AssemblyName System.Windows.Forms\n");
    }
    // Wait until PowerShell has actually pressed the keys; otherwise the clipboard is swapped back before the paste.
    const done = new Promise((r) => ps.acks.push(r));
    ps.stdin.write(`${cmd}; Write-Output ok\n`);
    return Promise.race([done, new Promise((r) => setTimeout(r, 3000))]);
  }
  await run(cmd[0], cmd[1]);
}

let chain = Promise.resolve();

/** Type text at the cursor of the focused app. Calls are queued so phrases never interleave. */
export function typeText(text) {
  chain = chain.then(async () => {
    const { clipboard } = await import("electron"); // lazy, so this module also loads in plain-Node tests
    // ponytail: restores copied text only (Electron 44's clipboard has no readHTML/readImage); a copied image is replaced.
    // Awaited because Electron 44's clipboard calls can return promises; harmless where they're synchronous.
    const saved = await clipboard.readText();
    await clipboard.writeText(text);
    await press("paste");
    // Give the target app time to read the clipboard before putting the user's content back.
    await new Promise((r) => setTimeout(r, 350));
    await clipboard.writeText(typeof saved === "string" ? saved : "");
  }).catch((e) => console.error("[kelados] type failed:", e.message));
  return chain;
}

export const undo = () => (chain = chain.then(() => press("undo")).catch(() => {}));

export const dispose = () => ps?.kill();

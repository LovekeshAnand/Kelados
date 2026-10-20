// Typing into other apps without native modules: put the text on the clipboard and press the OS paste shortcut
// with the platform's own automation tool. The previous clipboard is restored afterwards.
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);
let ps = null; // one long-lived PowerShell on Windows: ~5 ms per keystroke instead of ~400 ms per spawn

const COMBOS = {
  win32: { paste: "^v", undo: "^z", enter: "{ENTER}", tab: "{TAB}", backspace: "^{BACKSPACE}", selectAll: "^a", copy: "^c" },
  darwin: {
    paste: 'keystroke "v" using command down', undo: 'keystroke "z" using command down', enter: "key code 36", tab: "key code 48",
    backspace: "key code 51 using option down", selectAll: 'keystroke "a" using command down', copy: 'keystroke "c" using command down',
  },
  linux: { paste: "ctrl+v", undo: "ctrl+z", enter: "Return", tab: "Tab", backspace: "ctrl+BackSpace", selectAll: "ctrl+a", copy: "ctrl+c" },
};
/** Keys the overlay may press by voice ("press enter", "select all"). Undo and paste are internal. */
export const VOICE_KEYS = ["enter", "tab", "backspace", "selectAll", "copy", "paste"];

/** The command that presses `combo` on this platform (exported for tests). */
export function keystroke(platform, combo) {
  const k = COMBOS[platform]?.[combo];
  if (!k) throw new Error(`Unsupported: ${platform} ${combo}`);
  if (platform === "win32") return `[System.Windows.Forms.SendKeys]::SendWait("${k}")`;
  if (platform === "darwin") return ["osascript", ["-e", `tell application "System Events" to ${k}`]];
  // ponytail: terminals on Linux paste with ctrl+shift+v; detect the focused window class if that matters.
  return ["xdotool", ["key", "--clearmodifiers", k]];
}

/** The command that presses Backspace n times on this platform (exported for tests). */
export function backspaces(platform, n) {
  if (platform === "win32") return `[System.Windows.Forms.SendKeys]::SendWait("{BACKSPACE ${n}}")`;
  if (platform === "darwin") return ["osascript", ["-e", 'tell application "System Events"', "-e", `repeat ${n} times`, "-e", "key code 51", "-e", "end repeat", "-e", "end tell"]];
  return ["xdotool", ["key", "--clearmodifiers", "--repeat", String(n), "--delay", "2", "BackSpace"]];
}

const DONE = "__kelados_done__";

/** Run a command in one long-lived PowerShell (~5 ms each instead of ~400 ms per spawn) and resolve with its output. */
function powershell(cmd) {
  if (!ps) {
    ps = spawn("powershell", ["-NoProfile", "-NoLogo", "-Command", "-"], { stdio: ["pipe", "pipe", "ignore"], windowsHide: true });
    ps.queue = [];
    ps.out = "";
    // Each command ends by printing a marker; everything before it is that command's output.
    ps.stdout.setEncoding("utf8").on("data", (d) => {
      ps.out += d;
      for (let i; (i = ps.out.indexOf(DONE)) >= 0;) {
        const result = ps.out.slice(0, i).trim();
        ps.out = ps.out.slice(i + DONE.length).replace(/^\r?\n/, "");
        ps.queue.shift()?.(result);
      }
    });
    ps.on("exit", () => { ps?.queue.forEach((r) => r("")); ps = null; });
    ps.stdin.write("Add-Type -AssemblyName System.Windows.Forms\n");
    ps.stdin.write(`Add-Type -Namespace Kel -Name U -MemberDefinition '[DllImport("user32.dll")] public static extern System.IntPtr GetForegroundWindow(); [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetClassName(System.IntPtr h, System.Text.StringBuilder s, int n);'\n`);
  }
  const done = new Promise((r) => ps.queue.push(r));
  ps.stdin.write(`${cmd}; Write-Output ${DONE}\n`);
  return Promise.race([done, new Promise((r) => setTimeout(() => r(""), 3000))]);
}

export async function press(combo) {
  const cmd = typeof combo === "number" ? backspaces(process.platform, combo) : keystroke(process.platform, combo);
  // Wait until the keys are actually pressed; otherwise the clipboard is swapped back before the paste.
  if (process.platform === "win32") return powershell(cmd);
  await run(cmd[0], cmd[1]);
}

// Windows classes of the desktop and taskbar, where there's no text field to type into.
const DESKTOP_CLASSES = new Set(["", "Progman", "WorkerW", "Shell_TrayWnd", "Shell_SecondaryTrayWnd"]);

/** True when the foreground answer means "the desktop, the taskbar or no window" (exported for tests). */
export function isNowhere(platform, answer) {
  if (platform === "win32") return DESKTOP_CLASSES.has(answer.trim());
  if (platform === "darwin") return answer.trim() === "0"; // Finder in front with no windows open: the desktop
  return answer === null || /desktop|plasmashell/i.test(answer); // Linux: no active window, or the desktop itself
}

/** Is there nothing in front that can take typing? Then dictation goes to a sticky note instead. */
export async function nothingToTypeInto() {
  try {
    if (process.platform === "win32") {
      return isNowhere("win32", await powershell("$b = New-Object System.Text.StringBuilder 256; [void][Kel.U]::GetClassName([Kel.U]::GetForegroundWindow(), $b, 256); $b.ToString()"));
    }
    if (process.platform === "darwin") {
      const { stdout } = await run("osascript", ["-e", 'tell application "System Events" to set p to first application process whose frontmost is true',
        "-e", 'if name of p is "Finder" then return (count of windows of p) as text', "-e", 'return "app"']);
      return isNowhere("darwin", stdout);
    }
    const { stdout } = await run("xdotool", ["getactivewindow", "getwindowclassname"]).catch(() => ({ stdout: null }));
    return isNowhere("linux", stdout);
  } catch {
    return false; // when unsure, type as usual
  }
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

/** Replace the last `count` characters Kelados typed with `text` (a voice edit). Assumes the cursor hasn't moved. */
export function replaceTyped(count, text) {
  chain = chain.then(() => press(count)).catch(() => {});
  return text ? typeText(text) : chain;
}

export const pressKey = (combo) => (chain = chain.then(() => press(combo)).catch(() => {}));

/** The text selected in the focused app: copy it, read the clipboard, then put the user's clipboard back. */
export function selectedText() {
  let text = "";
  chain = chain.then(async () => {
    const { clipboard } = await import("electron");
    const saved = await clipboard.readText();
    await clipboard.writeText("");
    await press("copy");
    await new Promise((r) => setTimeout(r, 250));
    text = await clipboard.readText();
    await clipboard.writeText(typeof saved === "string" ? saved : "");
  }).catch(() => {});
  return chain.then(() => text);
}

export const undo = () => (chain = chain.then(() => press("undo")).catch(() => {}));

export const dispose = () => ps?.kill();

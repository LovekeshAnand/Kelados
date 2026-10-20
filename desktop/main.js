// Kelados desktop: a tray app with a global shortcut that types what you say into whatever app is focused.
// The overlay is the website's /desktop/ page, so the desktop app shares the web app's models, cache and settings.
import { app, BrowserWindow, clipboard, dialog, globalShortcut, ipcMain, Menu, nativeImage, Notification, screen, session, shell, systemPreferences, Tray } from "electron";
import { spawn } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dispose, nothingToTypeInto, pressKey, replaceTyped, selectedText, typeText, undo, VOICE_KEYS } from "./keys.js";
import { latestIfNewer } from "./update.js";

const urlArg = process.argv.find((a) => a.startsWith("--url="))?.slice(6); // `npm run dev` points at localhost
const BASE = (urlArg || process.env.KELADOS_URL || "https://kelados.in").replace(/\/$/, "");
const ORIGIN = new URL(BASE).origin;
const SHORTCUT = "CommandOrControl+Shift+Space";
const REWIND = "CommandOrControl+Alt+R"; // type what you said in the last 30 s (only while Rewind is on)
const READ = "CommandOrControl+Alt+S"; // read the selected text aloud, in any app (again to stop)
const SITE = "https://kelados.in"; // install scripts live here even when BASE points at a dev server
const SMOKE = process.argv.includes("--smoke"); // CI: load the overlay, report, quit
const asset = (p) => fileURLToPath(new URL(p, import.meta.url));

const TITLE_BAR = { dark: { color: "#09090a", symbolColor: "#a1a1aa" }, light: { color: "#f1f1f2", symbolColor: "#52525b" } };

let overlay, win, tray, hideTimer;
// The sticky note: where dictation goes when there's no text field in front (the desktop, the taskbar, no window).
let note = null, noteReady = false, noteMode = false;
const noteQueue = [];
let status = "idle";
let update = null; // newer release tag, once found

// Windows only shows notifications for an app ID that matches the installer's shortcut (build.appId).
if (process.platform === "win32") app.setAppUserModelId("dev.kelados.desktop");
// A second launch only wakes the running app (see "second-instance") and exits before creating anything.
if (!app.requestSingleInstanceLock()) app.exit(0);

const fromUs = (e) => { try { return new URL(e.senderFrame.url).origin === ORIGIN; } catch { return false; } };

function lockDown(win) {
  // Remote content gets the preload bridge, so it must never navigate anywhere else.
  win.webContents.on("will-navigate", (e, url) => { if (new URL(url).origin !== ORIGIN) e.preventDefault(); });
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: "deny" }; });
}

function placeOverlay() {
  const { workArea } = screen.getPrimaryDisplay();
  const [w, h] = overlay.getSize();
  overlay.setPosition(Math.round(workArea.x + (workArea.width - w) / 2), workArea.y + workArea.height - h - 24);
}

function createOverlay() {
  overlay = new BrowserWindow({
    width: 440, height: 140, show: false, frame: false, transparent: true, resizable: false, hasShadow: false,
    skipTaskbar: true, alwaysOnTop: true, focusable: false, // never steal focus from the app you're typing into
    webPreferences: { preload: asset("./preload.cjs"), sandbox: true, contextIsolation: true, backgroundThrottling: false },
  });
  overlay.setAlwaysOnTop(true, "screen-saver");
  overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  lockDown(overlay);
  placeOverlay();
  // ponytail: needs the site reachable at launch; bundle the static export into the app if offline start matters.
  overlay.webContents.on("did-fail-load", (_e, code, desc, url) => {
    if (SMOKE) { console.error(`[smoke] failed: ${code} ${desc} ${url}`); app.exit(1); }
    setTimeout(() => overlay.loadURL(`${BASE}/desktop/`), 10_000);
  });
  overlay.webContents.on("did-finish-load", async () => {
    if (!SMOKE) return;
    const ok = await overlay.webContents.executeJavaScript("typeof window.kelados?.insert === 'function' && document.title");
    console.log(`[smoke] loaded ${BASE}/desktop/ · bridge ${ok ? "ok" : "missing"} · title "${ok}"`);
    app.exit(ok ? 0 : 1);
  });
  overlay.loadURL(`${BASE}/desktop/`);
}

/** The app window (home, history, dictionary, settings). Same origin as the overlay, so settings changes reach it live. */
function openWindow(path) {
  if (!win || win.isDestroyed()) {
    // Kelados draws its own title bar; Windows/Linux keep native buttons as an overlay recoloured to the theme.
    win = new BrowserWindow({ width: 1180, height: 820, minWidth: 820, minHeight: 560, title: "Kelados", backgroundColor: TITLE_BAR.dark.color,
      autoHideMenuBar: true, icon: asset("./build/icon.png"), titleBarStyle: "hidden",
      ...(process.platform === "darwin" ? { trafficLightPosition: { x: 16, y: 14 } } : { titleBarOverlay: { ...TITLE_BAR.dark, height: 44 } }),
      webPreferences: { preload: asset("./preload.cjs"), sandbox: true, contextIsolation: true } });
    lockDown(win);
  }
  win.loadURL(`${BASE}${path}`);
  win.show();
  win.focus();
}
const openWelcome = () => openWindow("/app/");
const openSettings = () => openWindow("/app/#settings");

/** First launch: say hello (otherwise the app just vanishes into the tray) and ask macOS for the permissions it needs. */
async function firstRun() {
  const flag = join(app.getPath("userData"), "welcomed");
  if (existsSync(flag)) return;
  writeFileSync(flag, new Date().toISOString());
  if (process.platform === "darwin") {
    await systemPreferences.askForMediaAccess("microphone");
    systemPreferences.isTrustedAccessibilityClient(true); // opens the Accessibility prompt; needed to type into other apps
  }
  openWelcome();
}

/** Open (or bring back) the sticky note. Text reaches it over IPC, so the clipboard is never touched. */
function openNote() {
  if (!note || note.isDestroyed()) {
    const { workArea } = screen.getPrimaryDisplay();
    note = new BrowserWindow({ width: 420, height: 360, minWidth: 300, minHeight: 220, frame: false, alwaysOnTop: true, title: "Kelados note",
      x: workArea.x + workArea.width - 444, y: workArea.y + workArea.height - 560, backgroundColor: TITLE_BAR.dark.color,
      icon: asset("./build/icon.png"), webPreferences: { preload: asset("./preload.cjs"), sandbox: true, contextIsolation: true } });
    lockDown(note);
    noteReady = false;
    note.on("closed", () => { note = null; noteReady = false; noteMode = false; noteQueue.length = 0; });
    note.loadURL(`${BASE}/app/note/`);
  }
  note.show();
  note.focus();
}
const toNote = (channel, ...args) => (noteReady ? note.webContents.send(channel, ...args) : noteQueue.push([channel, args]));

const toggle = async () => {
  // Starting a dictation: with nowhere to type (or the note itself in front), the words go to the sticky note.
  if (status === "idle") {
    noteMode = Boolean(note && !note.isDestroyed() && note.isFocused()) || (await nothingToTypeInto());
    if (noteMode) openNote();
  }
  overlay?.webContents.send("toggle");
};

function setStatus(s) {
  status = s;
  clearTimeout(hideTimer);
  if (s === "idle") hideTimer = setTimeout(() => overlay.hide(), 1500); // leave the last phrase visible briefly
  else if (!overlay.isVisible()) { placeOverlay(); overlay.showInactive(); }
  refreshTray();
}

function refreshTray() {
  tray.setToolTip(status === "listening" ? "Kelados · listening" : "Kelados · Ctrl+Shift+Space to dictate");
  tray.setContextMenu(Menu.buildFromTemplate([
    ...(update ? [{ label: `Install update ${update} now`, click: installUpdate }, { type: "separator" }] : []),
    { label: status === "idle" ? "Start dictation" : "Stop dictation", accelerator: SHORTCUT, click: toggle },
    { type: "separator" },
    { label: "Open Kelados…", click: openWelcome },
    { label: "New note", click: openNote },
    { label: "Settings…", click: openSettings },
    { label: "Open the Kelados website", click: () => shell.openExternal(BASE) },
    { label: "Launch at login", type: "checkbox", checked: app.getLoginItemSettings().openAtLogin,
      click: (i) => app.setLoginItemSettings({ openAtLogin: i.checked }) },
    { type: "separator" },
    { label: "Quit Kelados", role: "quit" },
  ]));
}

app.whenReady().then(() => {
  // Microphone only for our own pages; everything else is refused.
  const ours = (url) => { try { return new URL(url).origin === ORIGIN; } catch { return false; } };
  // Microphone and writing to the clipboard (Copy buttons), only for our own pages; everything else is refused.
  const ALLOWED = new Set(["media", "clipboard-sanitized-write"]);
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb, d) => cb(ALLOWED.has(perm) && ours(d.requestingUrl || wc.getURL())));
  session.defaultSession.setPermissionCheckHandler((_wc, perm, origin) => ALLOWED.has(perm) && origin === ORIGIN);

  app.dock?.hide();
  createOverlay();
  if (SMOKE) return;

  const icon = nativeImage.createFromPath(asset("./build/tray.png"));
  tray = new Tray(icon);
  // Clicking the tray focuses the taskbar, so dictating from here would type into nothing: open the app instead.
  tray.on("click", openWelcome);
  refreshTray();

  if (!globalShortcut.register(SHORTCUT, toggle)) {
    dialog.showMessageBox({ type: "warning", title: "Kelados", message: "Ctrl+Shift+Space is already used by another app.",
      detail: "Quit that app (or change its shortcut) and restart Kelados. You can still start dictation from the tray menu." });
  }
  globalShortcut.register(READ, async () => overlay.webContents.send("read", await selectedText()));
  if (process.argv.includes("--note")) openNote(); else firstRun();
  nothingToTypeInto(); // starts the helper now, so the first shortcut press isn't half a second slower
  setTimeout(checkForUpdate, 15_000);
  setInterval(checkForUpdate, 24 * 3600_000);
});

/**
 * Update in place with the same one-line installer people run by hand (kelados.in/install.ps1 or install.sh): it downloads
 * the latest release, closes this app, installs over it and starts the new version. Settings and history are kept.
 */
function installUpdate() {
  const [cmd, args] = process.platform === "win32"
    ? ["powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", `irm ${SITE}/install.ps1 | iex`]]
    : ["sh", ["-c", `curl -fsSL ${SITE}/install.sh | sh`]];
  spawn(cmd, args, { detached: true, stdio: "ignore", windowsHide: true }).unref();
  app.quit();
}

async function checkForUpdate() {
  const tag = await latestIfNewer(app.getVersion());
  if (!tag || tag === update) return;
  update = tag;
  refreshTray();
  if (Notification.isSupported()) {
    const n = new Notification({ title: "Kelados update available", body: `${tag} is ready. Click to install it (takes about a minute).` });
    n.on("click", installUpdate);
    n.show();
  }
}

ipcMain.on("insert", (e, text) => { if (fromUs(e) && text) (noteMode ? toNote("note-text", text) : typeText(text)); });
ipcMain.on("undo", (e) => { if (fromUs(e)) (noteMode ? toNote("note-undo") : undo()); });
ipcMain.on("note-ready", (e) => {
  if (!fromUs(e) || !note || e.sender !== note.webContents) return;
  noteReady = true;
  for (const [channel, args] of noteQueue.splice(0)) note.webContents.send(channel, ...args);
});
ipcMain.on("status", (e, s) => { if (fromUs(e) && !SMOKE) setStatus(s); });
ipcMain.on("theme", (e, t) => {
  if (fromUs(e) && win && !win.isDestroyed() && process.platform !== "darwin" && TITLE_BAR[t]) win.setTitleBarOverlay(TITLE_BAR[t]);
});
ipcMain.on("replace", (e, count, text) => {
  if (!fromUs(e) || !Number.isInteger(count) || count <= 0 || count > 20000) return;
  if (noteMode) toNote("note-replace", count, String(text ?? "")); else replaceTyped(count, String(text ?? ""));
});
// WhatsApp: the desktop app if it's installed (it registers whatsapp:// links), otherwise WhatsApp Web in the browser.
ipcMain.on("copy", (e, text) => { if (fromUs(e)) clipboard.writeText(String(text)); });
ipcMain.on("whatsapp", (e, text) => {
  if (!fromUs(e)) return;
  const msg = encodeURIComponent(String(text).slice(0, 4000));
  shell.openExternal(app.getApplicationNameForProtocol("whatsapp://") ? `whatsapp://send?text=${msg}` : `https://web.whatsapp.com/send?text=${msg}`);
});
ipcMain.on("key", (e, name) => {
  if (!fromUs(e) || !VOICE_KEYS.includes(name)) return;
  if (noteMode) { if (name === "enter") toNote("note-text", "\n"); } // other keys mean nothing on a note
  else pressKey(name);
});
ipcMain.on("rewind-enabled", (e, on) => {
  if (!fromUs(e)) return;
  if (on && !globalShortcut.isRegistered(REWIND)) globalShortcut.register(REWIND, () => overlay.webContents.send("rewind"));
  if (!on && globalShortcut.isRegistered(REWIND)) globalShortcut.unregister(REWIND);
});

// Launching it again (Start menu, Dock) brings the window up; `Kelados --note` opens a new sticky note instead.
app.on("second-instance", (_e, argv) => (argv.includes("--note") ? openNote() : openWelcome()));
app.on("window-all-closed", () => {}); // tray app: keep running with no windows
app.on("will-quit", () => { globalShortcut.unregisterAll(); dispose(); });

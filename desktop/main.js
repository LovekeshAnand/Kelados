// Kelados desktop: a tray app with a global shortcut that types what you say into whatever app is focused.
// The overlay is the website's /desktop/ page, so the desktop app shares the web app's models, cache and settings.
import { app, BrowserWindow, dialog, globalShortcut, ipcMain, Menu, nativeImage, Notification, screen, session, shell, systemPreferences, Tray } from "electron";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dispose, typeText, undo } from "./keys.js";
import { latestIfNewer } from "./update.js";

const urlArg = process.argv.find((a) => a.startsWith("--url="))?.slice(6); // `npm run dev` points at localhost
const BASE = (urlArg || process.env.KELADOS_URL || "https://kelados.lovekeshanand6.workers.dev").replace(/\/$/, "");
const ORIGIN = new URL(BASE).origin;
const SHORTCUT = "CommandOrControl+Shift+Space";
const SMOKE = process.argv.includes("--smoke"); // CI: load the overlay, report, quit
const asset = (p) => fileURLToPath(new URL(p, import.meta.url));

let overlay, win, tray, hideTimer;
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

/** One app window for welcome and settings. Same origin as the overlay, so settings changes reach it live. */
function openWindow(path) {
  if (!win || win.isDestroyed()) {
    win = new BrowserWindow({ width: 1100, height: 820, title: "Kelados", backgroundColor: "#050405", autoHideMenuBar: true,
      icon: asset("./build/icon.png"), webPreferences: { sandbox: true, contextIsolation: true } });
    lockDown(win);
  }
  win.loadURL(`${BASE}${path}`);
  win.show();
  win.focus();
}
const openWelcome = () => openWindow("/welcome/");
const openSettings = () => openWindow("/dictate/");

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

const toggle = () => overlay?.webContents.send("toggle");

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
    ...(update ? [{ label: `Update available: ${update}…`, click: () => shell.openExternal(`${BASE}/download/`) }, { type: "separator" }] : []),
    { label: status === "idle" ? "Start dictation" : "Stop dictation", accelerator: SHORTCUT, click: toggle },
    { type: "separator" },
    { label: "How to use Kelados…", click: openWelcome },
    { label: "Settings, snippets & dictionary…", click: openSettings },
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
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb, d) => cb(perm === "media" && ours(d.requestingUrl || wc.getURL())));
  session.defaultSession.setPermissionCheckHandler((_wc, perm, origin) => perm === "media" && origin === ORIGIN);

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
  firstRun();
  setTimeout(checkForUpdate, 15_000);
  setInterval(checkForUpdate, 24 * 3600_000);
});

async function checkForUpdate() {
  const tag = await latestIfNewer(app.getVersion());
  if (!tag || tag === update) return;
  update = tag;
  refreshTray();
  if (Notification.isSupported()) {
    const n = new Notification({ title: "Kelados update available", body: `${tag} is ready. Click to download it.` });
    n.on("click", () => shell.openExternal(`${BASE}/download/`));
    n.show();
  }
}

ipcMain.on("insert", (e, text) => { if (fromUs(e) && text) typeText(text); });
ipcMain.on("undo", (e) => { if (fromUs(e)) undo(); });
ipcMain.on("status", (e, s) => { if (fromUs(e) && !SMOKE) setStatus(s); });

app.on("second-instance", openWelcome); // launching it again (Start menu, Dock) brings the window up
app.on("window-all-closed", () => {}); // tray app: keep running with no windows
app.on("will-quit", () => { globalShortcut.unregisterAll(); dispose(); });

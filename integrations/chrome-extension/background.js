// Kelados Chrome extension. Dictation itself runs on the Kelados site (one mic permission, models cached there);
// this worker opens that page in a small window and types each phrase into the tab you started from.
import { insertText } from "./insert.js";

// Self-hosting? Change this and "externally_connectable" in manifest.json.
const KELADOS = "https://kelados.in";
const DEV = "http://localhost:3000"; // `npm run dev` in frontend/

// MV3 workers sleep after ~30 s idle, so the session lives in storage, not a variable.
const getSession = async () => (await chrome.storage.session.get("session")).session ?? null;
const setSession = (session) => chrome.storage.session.set({ session });

chrome.action.onClicked.addListener(async (tab) => {
  const session = await getSession();
  if (session) {
    await chrome.windows.remove(session.windowId).catch(() => {});
    return setSession(null);
  }
  const { dev } = await chrome.storage.local.get("dev");
  const base = dev ? DEV : KELADOS;
  const parent = await chrome.windows.get(tab.windowId);
  const win = await chrome.windows.create({
    url: `${base}/extension/?ext=${chrome.runtime.id}&tab=${tab.id}`,
    type: "popup", width: 440, height: 170, focused: true,
    left: Math.max(0, (parent.left ?? 0) + (parent.width ?? 1200) - 460), top: (parent.top ?? 0) + 90,
  });
  await setSession({ tabId: tab.id, windowId: win.id });
});

chrome.windows.onRemoved.addListener(async (id) => {
  if ((await getSession())?.windowId === id) await setSession(null);
});

chrome.runtime.onMessageExternal.addListener((msg, sender, reply) => {
  const origin = sender.origin ?? new URL(sender.url).origin;
  if (origin !== KELADOS && origin !== DEV) return; // manifest already limits senders; belt and braces
  (async () => {
    const session = await getSession();
    if (msg?.type !== "insert" || !session || msg.tab !== session.tabId) return { ok: false, error: "dictation isn't active for this tab" };
    const [res] = await chrome.scripting.executeScript({ target: { tabId: session.tabId }, func: insertText, args: [String(msg.text)] });
    return res?.result ?? { ok: false, error: "no response from the page" };
  })().then(reply, (e) => reply({ ok: false, error: e.message }));
  return true; // reply asynchronously
});

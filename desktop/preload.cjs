// The only bridge between Kelados' hosted pages (overlay and app window) and the OS. Kept tiny on purpose.
const { contextBridge, ipcRenderer } = require("electron");

// One listener per channel: a page that registers again (React dev mode, a reload) replaces its old handler instead of
// adding a second one, which would start two dictations per key press and type everything twice.
const on = (channel, handler) => { ipcRenderer.removeAllListeners(channel); ipcRenderer.on(channel, handler); };

contextBridge.exposeInMainWorld("kelados", {
  onToggle: (cb) => on("toggle", () => cb()),
  insert: (text) => ipcRenderer.send("insert", String(text)),
  undo: () => ipcRenderer.send("undo"),
  status: (s) => ipcRenderer.send("status", String(s)),
  onRewind: (cb) => on("rewind", () => cb()),
  onRead: (cb) => on("read", (_e, text) => cb(String(text))),
  key: (name) => ipcRenderer.send("key", String(name)),
  replace: (count, text) => ipcRenderer.send("replace", Math.floor(Number(count)), String(text)),
  theme: (t) => ipcRenderer.send("theme", String(t)),
  whatsapp: (text) => ipcRenderer.send("whatsapp", String(text)),
  copy: (text) => ipcRenderer.send("copy", String(text)),
  // The sticky note window: dictated text, "scratch that", and voice edits, routed here instead of being typed.
  onNote: (cb) => {
    on("note-text", (_e, text) => cb({ type: "text", text: String(text) }));
    on("note-undo", () => cb({ type: "undo" }));
    on("note-replace", (_e, count, text) => cb({ type: "replace", count: Number(count), text: String(text) }));
    ipcRenderer.send("note-ready");
  },
  setRewind: (on) => ipcRenderer.send("rewind-enabled", !!on),
});

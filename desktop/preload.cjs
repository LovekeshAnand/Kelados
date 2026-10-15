// The only bridge between the hosted overlay page and the OS. Kept tiny on purpose.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("kelados", {
  onToggle: (cb) => ipcRenderer.on("toggle", () => cb()),
  insert: (text) => ipcRenderer.send("insert", String(text)),
  undo: () => ipcRenderer.send("undo"),
  status: (s) => ipcRenderer.send("status", String(s)),
});

"use client";
// Everything a visitor creates (audio, notes, dictations) lives in their own IndexedDB; nothing is uploaded.

export type HistoryItem = {
  id: string;
  text: string;
  voice: string;
  speed: number;
  duration: number;
  createdAt: number;
  blob: Blob;
};

export type NoteLine = { id: string; speaker: string; text: string; start: number; end: number };
export type Note = {
  id: string;
  /** "meeting": a call transcript with speakers. "personal": your own notes, dictated. Older notes have none (= meeting). */
  kind?: "meeting" | "personal";
  title: string;
  createdAt: number;
  updatedAt: number;
  duration: number;
  lines: NoteLine[];
  /** Meeting: side notes typed during the call. Personal: the note itself (dictated and edited). */
  scratch: string;
};

/** `seconds` of speech (for words per minute); `source` is where it was dictated. Older entries have neither. */
export type Dictation = { id: string; text: string; createdAt: number; seconds?: number; source?: "desktop" | "web" };

const DB = "kelados";
const STORES = ["history", "notes", "dictations"] as const;
type StoreName = (typeof STORES)[number];

let db: Promise<IDBDatabase> | null = null;
function open() {
  return (db ??= new Promise((ok, fail) => {
    const req = indexedDB.open(DB, 2);
    req.onupgradeneeded = () => {
      for (const name of STORES)
        if (!req.result.objectStoreNames.contains(name))
          req.result.createObjectStore(name, { keyPath: "id" }).createIndex("createdAt", "createdAt");
    };
    req.onsuccess = () => ok(req.result);
    req.onerror = () => { db = null; fail(req.error); };
  }));
}

async function tx<T>(store: StoreName, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await open();
  return new Promise((ok, fail) => {
    const req = fn(d.transaction(store, mode).objectStore(store));
    req.onsuccess = () => ok(req.result);
    req.onerror = () => fail(req.error);
  });
}

function table<T extends { id: string; createdAt: number }>(name: StoreName) {
  return {
    put: (item: T) => tx(name, "readwrite", (s) => s.put(item)),
    get: (id: string) => tx(name, "readonly", (s) => s.get(id)) as Promise<T | undefined>,
    remove: (id: string) => tx(name, "readwrite", (s) => s.delete(id)),
    clear: () => tx(name, "readwrite", (s) => s.clear()),
    list: async () => ((await tx(name, "readonly", (s) => s.getAll())) as T[]).sort((a, b) => b.createdAt - a.createdAt),
  };
}

export const historyDb = table<HistoryItem>("history");
export const notesDb = table<Note>("notes");
export const dictationsDb = table<Dictation>("dictations");

// The desktop overlay and the app window are separate pages on one origin; this tells the window to refresh.
const channel = () => (typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("kelados-dictations"));
export async function addDictation(item: Dictation) {
  await dictationsDb.put(item);
  const c = channel(); c?.postMessage("changed"); c?.close();
}
export function onDictationsChanged(cb: () => void) {
  const c = channel();
  if (c) c.onmessage = cb;
  return () => c?.close();
}

// Generated audio is uncompressed WAV (~3 MB a minute), so only the latest clips are kept.
const HISTORY_LIMIT = 50;
export async function addHistory(item: HistoryItem) {
  await historyDb.put(item);
  const all = await historyDb.list();
  await Promise.all(all.slice(HISTORY_LIMIT).map((h) => historyDb.remove(h.id)));
}
export const deleteHistory = historyDb.remove;
export const clearHistory = historyDb.clear;
export const listHistory = historyDb.list;

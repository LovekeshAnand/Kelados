"use client";
// Generated audio lives in the visitor's own IndexedDB; nothing is uploaded.

export type HistoryItem = {
  id: string;
  text: string;
  voice: string;
  speed: number;
  duration: number;
  createdAt: number;
  blob: Blob;
};

const DB = "kelados";
const STORE = "history";

function open(): Promise<IDBDatabase> {
  return new Promise((ok, fail) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" }).createIndex("createdAt", "createdAt");
    req.onsuccess = () => ok(req.result);
    req.onerror = () => fail(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((ok, fail) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => ok(req.result);
    req.onerror = () => fail(req.error);
  });
}

export const addHistory = (item: HistoryItem) => tx("readwrite", (s) => s.put(item));
export const deleteHistory = (id: string) => tx("readwrite", (s) => s.delete(id));
export const clearHistory = () => tx("readwrite", (s) => s.clear());
export const listHistory = async () =>
  ((await tx("readonly", (s) => s.getAll())) as HistoryItem[]).sort((a, b) => b.createdAt - a.createdAt);

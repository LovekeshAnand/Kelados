"use client";
import { useSyncExternalStore } from "react";

// Tiny localStorage-backed store: every component reading a key re-renders when it changes,
// and the static (server) render always sees the fallback, so hydration matches.
const listeners = new Map<string, Set<() => void>>();
const cache = new Map<string, { raw: string | null; value: unknown }>();

function read<T>(key: string, fallback: T): T {
  let raw: string | null = null;
  try { raw = localStorage.getItem(key); } catch {}
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value as T; // stable identity, as useSyncExternalStore requires
  let value = fallback;
  try { if (raw) value = typeof fallback === "object" && !Array.isArray(fallback) ? { ...fallback, ...JSON.parse(raw) } : JSON.parse(raw); } catch {}
  cache.set(key, { raw, value });
  return value;
}

export function writeLocal<T>(key: string, value: T) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  listeners.get(key)?.forEach((l) => l());
}

export function useLocal<T>(key: string, fallback: T): T {
  return useSyncExternalStore(
    (l) => {
      if (!listeners.has(key)) listeners.set(key, new Set());
      listeners.get(key)!.add(l);
      const onStorage = (e: StorageEvent) => e.key === key && l(); // other tabs / windows
      window.addEventListener("storage", onStorage);
      return () => { listeners.get(key)!.delete(l); window.removeEventListener("storage", onStorage); };
    },
    () => read(key, fallback),
    () => fallback,
  );
}

"use client";
import { useCallback, useEffect } from "react";
import { api, useAuth } from "@/lib/api";
import { useLocal, writeLocal } from "@/lib/local-store";
import type { Snippet } from "./cleanup";

const KEY = "kelados:snippets";
const NONE: Snippet[] = [];

/** Snippets + personal dictionary. Local first; synced to the account (and so to the desktop app) when signed in. */
export function useSnippets() {
  const { user } = useAuth();
  const items = useLocal(KEY, NONE);

  useEffect(() => {
    if (!user) return;
    api<{ items: Snippet[] }>("/api/snippets").then((r) => {
      // First sign-in on this device: keep local entries the account doesn't have yet.
      const local = JSON.parse(localStorage.getItem(KEY) || "[]") as Snippet[];
      writeLocal(KEY, [...r.items, ...local.filter((l) => !r.items.some((x) => x.trigger === l.trigger))]);
    }).catch(() => {});
  }, [user]);

  /** Update locally (cheap, per keystroke); `sync` also pushes to the account. */
  const save = useCallback(async (next: Snippet[], sync = false) => {
    writeLocal(KEY, next);
    if (sync && user) await api("/api/snippets", { method: "PUT", json: { items: next.filter((s) => s.trigger.trim() && s.text.trim()) } });
  }, [user]);

  return { items, save };
}

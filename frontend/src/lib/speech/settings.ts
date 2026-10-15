"use client";
import { LIVE_MODEL, sttModel } from "@/lib/engine/stt";
import { useLocal, writeLocal } from "@/lib/local-store";

export type DictateSettings = { model: string; language: string; sensitivity: number; fillers: boolean; commands: boolean };
const KEY = "kelados:dictate";
const DEFAULTS: DictateSettings = { model: LIVE_MODEL, language: "en", sensitivity: 1, fillers: true, commands: true };

/** Dictation preferences shared by the web page, desktop overlay, extension popup and Word panel (same origin, same storage). */
export function useDictateSettings() {
  const settings = useLocal(KEY, DEFAULTS);
  const update = (patch: Partial<DictateSettings>) => writeLocal(KEY, { ...settings, ...patch });
  const language = sttModel(settings.model).multilingual ? settings.language || null : null;
  return { settings, update, language };
}

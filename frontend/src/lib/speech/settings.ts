"use client";
import { HINDI_MODEL, HINGLISH_MODEL, LIVE_MODEL, MULTILINGUAL_MODEL, sttModel } from "@/lib/engine/stt";
import { useLocal, writeLocal } from "@/lib/local-store";

export type DictateSettings = {
  model: string; language: string; sensitivity: number; fillers: boolean; commands: boolean;
  /** Learn names and terms from your dictations and fix words the model mishears. */
  learn: boolean;
  /** Desktop: keep the last 30 s of mic audio in memory so it can be typed after the fact. Off by default (the mic stays on). */
  rewind: boolean;
};
const KEY = "kelados:dictate";
const DEFAULTS: DictateSettings = { model: LIVE_MODEL, language: "en", sensitivity: 1, fillers: true, commands: true, learn: true, rewind: false };

/** Languages offered up front; Whisper understands 99, and any code can still be typed. */
export const LANGUAGES: [string, string][] = [
  ["en", "English"], ["hinglish", "Hinglish · Hindi + English"], ["hi", "Hindi · हिंदी"], ["", "Detect automatically"], ["bn", "Bengali · বাংলা"], ["mr", "Marathi · मराठी"],
  ["ta", "Tamil · தமிழ்"], ["te", "Telugu · తెలుగు"], ["ur", "Urdu · اردو"], ["pa", "Punjabi · ਪੰਜਾਬੀ"], ["es", "Spanish"],
  ["fr", "French"], ["de", "German"], ["pt", "Portuguese"], ["ar", "Arabic"], ["ja", "Japanese"], ["zh", "Chinese"],
];

/** Dictation preferences shared by the web page, desktop overlay, extension popup and Word panel (same origin, same storage). */
export function useDictateSettings() {
  const settings = useLocal(KEY, DEFAULTS);
  const update = (patch: Partial<DictateSettings>) => writeLocal(KEY, { ...settings, ...patch });
  /** Each language gets its best measured engine: Moonshine for English, tuned models for Hinglish and Hindi, Whisper otherwise. */
  const setLanguage = (language: string) =>
    update({ language, model: language === "en" ? LIVE_MODEL : language === "hinglish" ? HINGLISH_MODEL : language === "hi" ? HINDI_MODEL
      : sttModel(settings.model).multilingual ? settings.model : MULTILINGUAL_MODEL });
  const language = sttModel(settings.model).multilingual ? settings.language || null : null;
  return { settings, update, setLanguage, language };
}

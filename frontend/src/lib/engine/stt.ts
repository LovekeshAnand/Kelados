"use client";
import { useSyncExternalStore } from "react";
import { hasModel } from "./cache";
import { keepModelCache } from "./tts";

export type SttModel = {
  id: string;
  name: string;
  note: string;
  multilingual: boolean;
  /** Word timings for subtitles; Moonshine doesn't produce them. */
  timestamps: boolean;
};

// Download sizes for the precisions the worker picks: 4-bit on WebGPU, 8-bit on CPU.
export const STT_MODELS: SttModel[] = [
  { id: "onnx-community/moonshine-base-ONNX", name: "Moonshine Base", note: "English · 60–100 MB · fastest live", multilingual: false, timestamps: false },
  { id: "onnx-community/whisper-tiny.en", name: "Whisper Tiny", note: "English · 40–100 MB", multilingual: false, timestamps: true },
  { id: "onnx-community/whisper-base", name: "Whisper Base", note: "99 languages · 80–145 MB", multilingual: true, timestamps: true },
  { id: "onnx-community/whisper-small", name: "Whisper Small", note: "99 languages · 250–300 MB · most accurate", multilingual: true, timestamps: true },
];
export const LIVE_MODEL = STT_MODELS[0].id;
export const FILE_MODEL = STT_MODELS[2].id;
export const sttModel = (id: string) => STT_MODELS.find((m) => m.id === id) ?? STT_MODELS[0];

export type SttState = {
  status: "idle" | "loading" | "ready" | "error";
  progress: number;
  model?: string;
  device?: string;
  error?: string;
  /** Weights already on this device: "loading" means reading from disk, not downloading. */
  cached?: boolean;
};
export type TimedChunk = { text: string; timestamp: [number, number | null] };
export type SttResult = { text: string; chunks: TimedChunk[] };
export type TranscribeOptions = { model: string; task?: "transcribe" | "translate"; language?: string | null; timestamps?: boolean };

const idle: SttState = { status: "idle", progress: 0 };
let state = idle;
let worker: Worker | null = null;
const listeners = new Set<() => void>();
const files = new Map<string, [number, number]>();
const jobs = new Map<string, { ok: (r: SttResult) => void; fail: (e: Error) => void }>();

function set(next: Partial<SttState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function boot() {
  keepModelCache();
  const w = new Worker("/workers/stt.js", { type: "module" });
  w.onmessage = ({ data }) => {
    if (data.type === "progress") {
      // Only weight files count: tiny configs finish first and would flash 100%.
      if (data.total > 1e6) files.set(data.file, [data.loaded, data.total]);
      let l = 0, t = 0;
      files.forEach(([a, b]) => { l += a; t += b; });
      set({ status: "loading", progress: t ? l / t : 0 });
    } else if (data.type === "ready") {
      set({ status: "ready", progress: 1, model: data.model, device: data.device, error: undefined });
    } else if (data.type === "result") {
      jobs.get(data.id)?.ok({ text: data.text, chunks: data.chunks });
      jobs.delete(data.id);
    } else if (data.type === "error") {
      if (data.id && jobs.has(data.id)) {
        jobs.get(data.id)!.fail(new Error(data.message));
        jobs.delete(data.id);
      } else set({ status: "error", error: data.message });
    }
  };
  w.onerror = (e) => {
    set({ status: "error", error: e.message || "The speech engine failed to start" });
    jobs.forEach((j) => j.fail(new Error(state.error)));
    jobs.clear();
  };
  return w;
}

const getWorker = () => (worker ??= boot());

/** Download (if needed) and warm a model in the background. */
export function loadStt(model: string) {
  if (state.model === model && (state.status === "loading" || state.status === "ready")) return;
  files.clear();
  set({ status: "loading", progress: 0, model, error: undefined });
  hasModel(model).then((cached) => { if (state.model === model) set({ cached }); });
  getWorker().postMessage({ type: "load", model });
}

/**
 * Called when a page opens: warm the model only if it's already on this device (a few seconds, no network).
 * Otherwise nothing is downloaded until the user actually starts, so browsing the site never costs hundreds of MB.
 */
export async function warmStt(model: string) {
  if (state.model === model && state.status !== "idle") return;
  if (await hasModel(model)) loadStt(model);
  else if (state.status !== "loading" && state.status !== "ready") set({ status: "idle", model, cached: false, progress: 0 });
}

/** True while a transcription is queued or running, so live previews can skip a beat instead of piling up. */
export const sttBusy = () => jobs.size > 0;

export function transcribe(audio: Float32Array, opts: TranscribeOptions): Promise<SttResult> {
  if (state.model !== opts.model) loadStt(opts.model);
  const id = crypto.randomUUID();
  return new Promise((ok, fail) => {
    jobs.set(id, { ok, fail });
    // Copy so callers can keep their buffer; transfer the copy to avoid a second clone.
    const copy = audio.slice();
    getWorker().postMessage({ type: "transcribe", id, audio: copy, ...opts }, [copy.buffer]);
  });
}

export function useStt() {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => state,
    () => idle,
  );
}

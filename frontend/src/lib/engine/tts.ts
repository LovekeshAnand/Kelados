"use client";
import { useSyncExternalStore } from "react";

export type EngineState = {
  status: "idle" | "loading" | "ready" | "error";
  progress: number; // 0..1 model download
  device?: "webgpu" | "wasm";
  error?: string;
  pref: DevicePref;
};
export type DevicePref = "auto" | "wasm";
type Chunk = { text: string; audio: Float32Array; sampleRate: number };
type Job = { onChunk?: (c: Chunk) => void; chunks: Chunk[]; resolve: (r: Chunk[]) => void; reject: (e: Error) => void };

const PREF_KEY = "kelados:device";
export const TTS_MODEL = "onnx-community/Kokoro-82M-v1.0-ONNX";

let worker: Worker | null = null;
const serverState: EngineState = { status: "idle", progress: 0, pref: "auto" };
let state: EngineState = typeof window === "undefined" ? serverState : { ...serverState, pref: getDevicePref() };
const listeners = new Set<() => void>();
const files = new Map<string, { loaded: number; total: number }>();
const jobs = new Map<string, Job>();
let readyWaiters: { ok: () => void; fail: (e: Error) => void }[] = [];

function set(next: Partial<EngineState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export function getDevicePref(): DevicePref {
  try { return (localStorage.getItem(PREF_KEY) as DevicePref) || "auto"; } catch { return "auto"; }
}

/** Ask the browser not to evict hundreds of MB of cached model weights under storage pressure. */
export const keepModelCache = () => { navigator.storage?.persist?.().catch(() => {}); };

function boot() {
  keepModelCache();
  worker = new Worker("/workers/tts.js", { type: "module" });
  worker.onmessage = ({ data }) => {
    if (data.type === "progress") {
      if (data.total > 1e6) files.set(data.file, { loaded: data.loaded, total: data.total }); // weights only

      let l = 0, t = 0;
      files.forEach((f) => { l += f.loaded; t += f.total; });
      set({ progress: t ? l / t : 0 });
    } else if (data.type === "ready") {
      set({ status: "ready", progress: 1, device: data.device, error: undefined });
      readyWaiters.forEach((w) => w.ok());
      readyWaiters = [];
    } else if (data.type === "chunk") {
      const job = jobs.get(data.id);
      if (!job) return;
      const c = { text: data.text, audio: data.audio, sampleRate: data.sampleRate };
      job.chunks.push(c);
      job.onChunk?.(c);
    } else if (data.type === "done") {
      const job = jobs.get(data.id);
      jobs.delete(data.id);
      job?.resolve(job.chunks);
    } else if (data.type === "error") {
      if (data.id) {
        jobs.get(data.id)?.reject(new Error(data.message));
        jobs.delete(data.id);
      } else {
        set({ status: "error", error: data.message });
        readyWaiters.forEach((w) => w.fail(new Error(data.message)));
        readyWaiters = [];
      }
    }
  };
  worker.onerror = (e) => {
    set({ status: "error", error: e.message || "The voice engine failed to start" });
    readyWaiters.forEach((w) => w.fail(new Error(state.error)));
    readyWaiters = [];
  };
}

/** Load the model (idempotent). Resolves when the engine can speak. */
export function loadEngine(): Promise<void> {
  if (state.status === "ready") return Promise.resolve();
  if (!worker) boot();
  const p = new Promise<void>((ok, fail) => readyWaiters.push({ ok, fail }));
  if (state.status !== "loading") {
    files.clear();
    set({ status: "loading", progress: 0, error: undefined });
    worker!.postMessage({ type: "init", device: getDevicePref() });
  }
  return p;
}

/** Free the voice model's memory (over 1 GB on a GPU). The next call loads it again from the browser cache. */
export function unloadEngine() {
  if (jobs.size) return; // still speaking
  worker?.terminate();
  worker = null;
  set({ status: "idle", progress: 0, device: undefined });
}

/** Switch WebGPU/CPU. Tears down the worker; the next call reloads the model (cached, so fast). */
export function setDevicePref(pref: DevicePref) {
  try { localStorage.setItem(PREF_KEY, pref); } catch {}
  worker?.terminate();
  worker = null;
  jobs.forEach((j) => j.reject(new Error("Engine restarted")));
  jobs.clear();
  set({ status: "idle", progress: 0, device: undefined, pref });
}

/** Synthesize text sentence-by-sentence. Abort via signal to stop early (returns what was made so far). */
export async function synthesize(text: string, opts: { voice: string; speed: number; onChunk?: (c: Chunk) => void; signal?: AbortSignal }) {
  await loadEngine();
  const id = crypto.randomUUID();
  return new Promise<Chunk[]>((resolve, reject) => {
    jobs.set(id, { onChunk: opts.onChunk, chunks: [], resolve, reject });
    opts.signal?.addEventListener("abort", () => worker?.postMessage({ type: "cancel", id }), { once: true });
    worker!.postMessage({ type: "generate", id, text, voice: opts.voice, speed: opts.speed });
  });
}

export function useEngine() {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => state,
    () => serverState,
  );
}

/** Read text aloud, starting with the first sentence while the rest generates. Returns a stop function. */
export function speak(text: string, voice = "af_heart", speed = 1) {
  const ctx = new AudioContext();
  const abort = new AbortController();
  let next = ctx.currentTime + 0.05;
  const done = synthesize(text, {
    voice, speed, signal: abort.signal,
    onChunk: (c) => {
      if (ctx.state === "closed") return;
      const buf = ctx.createBuffer(1, c.audio.length, c.sampleRate);
      buf.copyToChannel(new Float32Array(c.audio), 0);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      next = Math.max(next, ctx.currentTime);
      src.start(next);
      next += buf.duration;
    },
  }).then(() => new Promise<void>((ok) => setTimeout(ok, Math.max(0, (next - ctx.currentTime) * 1000))))
    .finally(() => ctx.state !== "closed" && ctx.close());
  return { done, stop: () => { abort.abort(); if (ctx.state !== "closed") ctx.close(); } };
}

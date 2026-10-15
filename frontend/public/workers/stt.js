// Kelados STT worker: Whisper and Moonshine running in the browser via transformers.js.
// One model is kept in memory at a time; requests run in order because an ONNX session isn't re-entrant.
import { pipeline } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1";

// Hugging Face 404s any request whose Referer is a *.workers.dev site, so never send one.
const _fetch = self.fetch.bind(self);
self.fetch = (input, init) => _fetch(input, { ...init, referrerPolicy: "no-referrer" });

let current = null; // { model, pipe: Promise<pipeline> }
let queue = Promise.resolve();
let gpu;

const hasWebGPU = () => (gpu ??= (async () => {
  try { return !!(navigator.gpu && (await navigator.gpu.requestAdapter())); } catch { return false; }
})());

const isWhisper = (m) => m.includes("whisper");

/** Delete this model's cached weight files that weren't used (older precisions), so storage doesn't pile up. */
async function pruneCache(model, used) {
  try {
    const cache = await caches.open("transformers-cache");
    for (const req of await cache.keys()) {
      const url = req.url;
      if (url.includes(`/${model}/`) && url.endsWith(".onnx") && ![...used].some((f) => url.endsWith(`/${f}`))) await cache.delete(req);
    }
  } catch {}
}
const isMultilingual = (m) => isWhisper(m) && !m.endsWith(".en");

function load(model) {
  if (current?.model === model) return current.pipe;
  const previous = current;
  const pipe = (async () => {
    if (previous) await (await previous.pipe.catch(() => null))?.dispose?.();
    const webgpu = await hasWebGPU();
    const used = new Set();
    const asr = await pipeline("automatic-speech-recognition", model, {
      device: webgpu ? "webgpu" : "wasm",
      // Benchmarked on WebGPU: 4-bit encoder+decoder matches fp32 accuracy at ~60% of the download
      // (Moonshine 98 vs 154 MB, Whisper Base 143 vs 206 MB). fp16 and q8 produce garbage on WebGPU.
      dtype: webgpu ? { encoder_model: "q4", decoder_model_merged: "q4" } : "q8",
      progress_callback: (p) => {
        if (p.file) used.add(p.file);
        if (p.status === "progress") self.postMessage({ type: "progress", file: p.file, loaded: p.loaded, total: p.total });
      },
    });
    pruneCache(model, used);
    // The first run compiles WebGPU shaders and allocates buffers; pay that now, not on the user's first words.
    await asr(new Float32Array(16000), isMultilingual(model) ? { language: "en" } : {});
    self.postMessage({ type: "ready", model, device: webgpu ? "webgpu" : "wasm" });
    return asr;
  })();
  current = { model, pipe };
  pipe.catch(() => { if (current?.pipe === pipe) current = null; });
  return pipe;
}

async function transcribe({ id, audio, model, task, language, timestamps }) {
  const asr = await load(model);
  const out = await asr(audio, {
    ...(isWhisper(model) && timestamps && { return_timestamps: true }),
    ...(isMultilingual(model) && { task: task || "transcribe", language: language || null }),
  });
  self.postMessage({ type: "result", id, text: (out.text || "").trim(), chunks: out.chunks || [] });
}

const run = (fn, id) => {
  queue = queue.then(fn).catch((e) => self.postMessage({ type: "error", id, message: String(e?.message || e) }));
};

self.onmessage = ({ data }) => {
  if (data.type === "load") run(() => load(data.model));
  else if (data.type === "transcribe") run(() => transcribe(data), data.id);
};

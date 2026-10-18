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

// Whisper models fine-tuned for one language: a fixed language hint (null = none; the Hindi model rejects one) and an
// exact revision, so a change in someone else's repository never changes what Kelados runs. Their 8-bit weights garble
// on WebGPU (Intel Iris Xe), so they run on the CPU, which with cross-origin isolation uses every core: measured
// 1.1–1.7 s per sentence for Hinglish, 5–12 s for Devanagari Hindi.
const TUNED = {
  "Hirecentive-D3l/Whisper-Hindi2Hinglish-Swift-ONNX": { language: "en", revision: "24211661105a7bb9e96a170fb92db173667e31fd" },
  "onnx-community/whisper-hindi-small-ONNX": { language: null, revision: "af7e93b780198dec2a4867887c03912ac3cbae31" },
};
const isWhisper = (m) => /whisper/i.test(m);

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
const isMultilingual = (m) => isWhisper(m) && !m.endsWith(".en") && !TUNED[m];

function load(model) {
  if (current?.model === model) return current.pipe;
  const previous = current;
  const pipe = (async () => {
    if (previous) await (await previous.pipe.catch(() => null))?.dispose?.();
    // With cross-origin isolation the CPU runs on every core, and there it is both faster and far lighter than WebGPU.
    // Measured in the desktop app (Intel Iris Xe, 16 threads), Moonshine Base on one 8 s sentence: CPU 8-bit 0.9 s and
    // +370 MB; WebGPU 4-bit 1.5 s and +690 MB in the page plus +530 MB in the GPU process. WebGPU stays the fallback
    // for pages without isolation, where the CPU would be single-threaded.
    const webgpu = !self.crossOriginIsolated && (await hasWebGPU());
    const used = new Set();
    const asr = await pipeline("automatic-speech-recognition", model, {
      device: webgpu && !TUNED[model] ? "webgpu" : "wasm",
      ...(TUNED[model] && { revision: TUNED[model].revision }),
      // Benchmarked on WebGPU: 4-bit encoder+decoder matches fp32 accuracy at ~60% of the download
      // (Moonshine 98 vs 154 MB, Whisper Base 143 vs 206 MB). fp16 and q8 produce garbage on WebGPU (Intel Iris Xe:
      // "go go go…"). Whisper's encoder always runs a full 30 s window, and 4-bit matmuls are slow there, so small
      // Whisper encoders stay full precision: Whisper Base 1.3 s vs 1.7 s per sentence for +63 MB.
      dtype: TUNED[model] ? "q8" : webgpu ? { encoder_model: /whisper-(tiny|base)/.test(model) ? "fp32" : "q4", decoder_model_merged: "q4" } : "q8",
      progress_callback: (p) => {
        if (p.file) used.add(p.file);
        if (p.status === "progress") self.postMessage({ type: "progress", file: p.file, loaded: p.loaded, total: p.total });
      },
    });
    pruneCache(model, used);
    // The first run compiles WebGPU shaders and allocates buffers; pay that now, not on the user's first words.
    await asr(new Float32Array(16000), options(model, "en"));
    self.postMessage({ type: "ready", model, device: webgpu && !TUNED[model] ? "webgpu" : "wasm" });
    return asr;
  })();
  current = { model, pipe };
  pipe.catch(() => { if (current?.pipe === pipe) current = null; });
  return pipe;
}

// Whisper sometimes gets stuck repeating itself ("नहीं नहीं नहीं …" for 30 s on an 11 s clip). Nobody says the same
// word or phrase four times running, so keep one copy.
const unloop = (text) => text.replace(/([\p{L}\p{M}\p{N}'’]+(?:\s+[\p{L}\p{M}\p{N}'’]+){0,3})(?:[\s,.।]+\1(?![\p{L}\p{M}])){3,}/gu, "$1");

/** Language and task for a model: tuned models use their own fixed language, multilingual ones the user's choice. */
function options(model, language, task) {
  if (TUNED[model]) return TUNED[model].language ? { language: TUNED[model].language, task: "transcribe" } : {};
  return isMultilingual(model) ? { task: task || "transcribe", language: language || null } : {};
}

async function transcribe({ id, audio, model, task, language, timestamps }) {
  const asr = await load(model);
  const out = await asr(audio, {
    ...(isWhisper(model) && timestamps && { return_timestamps: true }),
    ...options(model, language, task),
    // Also cap the output by the audio's length (people say < 5 tokens a second), so a loop can't run for long.
    ...(isWhisper(model) && !timestamps && { max_new_tokens: Math.min(440, Math.round((audio.length / 16000) * 8) + 24) }),
  });
  self.postMessage({ type: "result", id, text: unloop((out.text || "").trim()), chunks: out.chunks || [] });
}

const run = (fn, id) => {
  queue = queue.then(fn).catch((e) => self.postMessage({ type: "error", id, message: String(e?.message || e) }));
};

self.onmessage = ({ data }) => {
  if (data.type === "load") run(() => load(data.model));
  else if (data.type === "transcribe") run(() => transcribe(data), data.id);
};

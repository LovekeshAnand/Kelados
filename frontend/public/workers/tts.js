// Kelados TTS worker: Kokoro-82M running fully in the visitor's browser (WebGPU or WASM).
// Model weights stream from the Hugging Face CDN and are cached by the browser after the first load.
import { KokoroTTS, TextSplitterStream } from "https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/dist/kokoro.web.js";

// Hugging Face 404s any request whose Referer is a *.workers.dev site, so never send one.
const _fetch = self.fetch.bind(self);
self.fetch = (input, init) => _fetch(input, { ...init, referrerPolicy: "no-referrer" });

const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";
let tts = null;
let loading = null;
const cancelled = new Set();
let queue = Promise.resolve();

/** Drop cached weights of the precision we're not using (after a GPU/CPU switch), so only one copy is stored. */
async function pruneCache(used) {
  try {
    const cache = await caches.open("transformers-cache");
    for (const req of await cache.keys()) {
      if (req.url.includes(`/${MODEL_ID}/`) && req.url.endsWith(".onnx") && ![...used].some((f) => req.url.endsWith(`/${f}`))) await cache.delete(req);
    }
  } catch {}
}

async function hasWebGPU() {
  try { return !!(navigator.gpu && (await navigator.gpu.requestAdapter())); } catch { return false; }
}

async function load(pref) {
  const device = pref === "wasm" ? "wasm" : (await hasWebGPU()) ? "webgpu" : "wasm";
  // Benchmarked: on WebGPU only fp32 is intelligible (fp16 and q8 produce garbled speech), so the GPU path
  // costs 326 MB; the CPU path uses q8 at 92 MB.
  const dtype = device === "webgpu" ? "fp32" : "q8";
  const used = new Set();
  tts = await KokoroTTS.from_pretrained(MODEL_ID, {
    dtype,
    device,
    progress_callback: (p) => {
      if (p.file) used.add(p.file);
      if (p.status === "progress") self.postMessage({ type: "progress", file: p.file, loaded: p.loaded, total: p.total });
    },
  });
  pruneCache(used);
  // The first generation compiles WebGPU shaders (seconds); do it before the user presses play.
  await tts.generate("Hi.", { voice: "af_heart" });
  return { device, dtype };
}

// Audio can only start once the first piece is synthesized, so make that piece short:
// split a long opening sentence at its first comma-like pause.
function firstPiece(text) {
  const end = text.search(/[.!?](\s|$)/);
  const sentence = end < 0 ? text : text.slice(0, end + 1);
  if (sentence.length < 140) return [text];
  const pause = sentence.slice(30, 120).search(/[,;:—]\s/);
  return pause < 0 ? [text] : [text.slice(0, 30 + pause + 1), text.slice(30 + pause + 2)];
}

async function generate({ id, text, voice, speed }) {
  for (const piece of firstPiece(text)) {
    // kokoro-js never closes the splitter for plain strings, so hand it a closed stream.
    const splitter = new TextSplitterStream();
    splitter.push(piece);
    splitter.close();
    for await (const { text: sentence, audio } of tts.stream(splitter, { voice, speed })) {
      if (cancelled.has(id)) break;
      const samples = audio.audio;
      self.postMessage({ type: "chunk", id, text: sentence, audio: samples, sampleRate: audio.sampling_rate }, [samples.buffer]);
    }
    if (cancelled.has(id)) break;
  }
  cancelled.delete(id);
  self.postMessage({ type: "done", id });
}

self.onmessage = async ({ data }) => {
  if (data.type === "init") {
    try {
      loading ??= load(data.device);
      const info = await loading;
      self.postMessage({ type: "ready", ...info });
    } catch (e) {
      loading = null;
      self.postMessage({ type: "error", message: String(e?.message || e) });
    }
  } else if (data.type === "generate") {
    queue = queue.then(() => generate(data)).catch((e) =>
      self.postMessage({ type: "error", id: data.id, message: String(e?.message || e) }));
  } else if (data.type === "cancel") {
    cancelled.add(data.id);
  }
};

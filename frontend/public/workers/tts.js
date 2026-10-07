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

async function hasWebGPU() {
  try { return !!(navigator.gpu && (await navigator.gpu.requestAdapter())); } catch { return false; }
}

async function load(pref) {
  const device = pref === "wasm" ? "wasm" : (await hasWebGPU()) ? "webgpu" : "wasm";
  const dtype = device === "webgpu" ? "fp32" : "q8";
  tts = await KokoroTTS.from_pretrained(MODEL_ID, {
    dtype,
    device,
    progress_callback: (p) => {
      if (p.status === "progress") self.postMessage({ type: "progress", file: p.file, loaded: p.loaded, total: p.total });
    },
  });
  return { device, dtype };
}

async function generate({ id, text, voice, speed }) {
  // kokoro-js never closes the splitter for plain strings, so hand it a closed stream.
  const splitter = new TextSplitterStream();
  splitter.push(text);
  splitter.close();
  for await (const { text: sentence, audio } of tts.stream(splitter, { voice, speed })) {
    if (cancelled.has(id)) break;
    const samples = audio.audio;
    self.postMessage({ type: "chunk", id, text: sentence, audio: samples, sampleRate: audio.sampling_rate }, [samples.buffer]);
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

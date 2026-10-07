// Kelados STT worker: Whisper running in the browser via transformers.js.
import { pipeline } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1";

// Hugging Face 404s any request whose Referer is a *.workers.dev site, so never send one.
const _fetch = self.fetch.bind(self);
self.fetch = (input, init) => _fetch(input, { ...init, referrerPolicy: "no-referrer" });

const pipes = new Map();

async function hasWebGPU() {
  try { return !!(navigator.gpu && (await navigator.gpu.requestAdapter())); } catch { return false; }
}

async function getPipe(model) {
  if (!pipes.has(model)) {
    pipes.set(model, (async () => {
      const webgpu = await hasWebGPU();
      return pipeline("automatic-speech-recognition", model, {
        device: webgpu ? "webgpu" : "wasm",
        dtype: webgpu ? { encoder_model: "fp32", decoder_model_merged: "q4" } : "q8",
        progress_callback: (p) => {
          if (p.status === "progress") self.postMessage({ type: "progress", file: p.file, loaded: p.loaded, total: p.total });
        },
      });
    })().catch((e) => { pipes.delete(model); throw e; }));
  }
  return pipes.get(model);
}

self.onmessage = async ({ data }) => {
  if (data.type !== "transcribe") return;
  try {
    const asr = await getPipe(data.model);
    self.postMessage({ type: "status", message: "Transcribing…" });
    const multilingual = !data.model.endsWith(".en");
    const out = await asr(data.audio, {
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: true,
      ...(multilingual && { task: data.task || "transcribe", language: data.language || null }),
    });
    self.postMessage({ type: "result", text: out.text.trim(), chunks: out.chunks || [] });
  } catch (e) {
    self.postMessage({ type: "error", message: String(e?.message || e) });
  }
};

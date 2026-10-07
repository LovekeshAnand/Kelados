import { writeFile } from "node:fs/promises";

export const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";
// Production API used for optional workspace sync; override with KELADOS_API_URL or the baseUrl option.
export const DEFAULT_API = "https://kelados.vercel.app";

/** Encode mono float samples [-1, 1] as a 16-bit PCM WAV file. */
export function encodeWav(samples, sampleRate) {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + samples.length * 2, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24); buf.writeUInt32LE(sampleRate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  return buf;
}

/** Apply pronunciation rules (whole-word, case-insensitive; works for terms like "C++" too). */
export function applyLexicon(text, rules = []) {
  return rules.reduce((t, { from, to }) =>
    t.replace(new RegExp(`(?<!\\w)${from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?!\\w)`, "gi"), to), text);
}

function concat(chunks) {
  const out = new Float32Array(chunks.reduce((n, c) => n + c.length, 0));
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}

/**
 * Create a Kelados client. Synthesis always runs locally; the optional apiKey only
 * syncs your presets/lexicon from kelados and reports character counts to your dashboard.
 */
export async function createKelados({ apiKey = process.env.KELADOS_API_KEY, baseUrl = process.env.KELADOS_API_URL || DEFAULT_API,
  dtype = "q8", device = "cpu", onProgress } = {}) {
  const { KokoroTTS, TextSplitterStream } = await import("kokoro-js");
  const tts = await KokoroTTS.from_pretrained(MODEL_ID, { dtype, device, progress_callback: onProgress });

  let workspace = { presets: [], lexicon: [] };
  const api = (path, init = {}) => fetch(baseUrl + path, {
    ...init, headers: { "x-api-key": apiKey, "content-type": "application/json", ...init.headers },
  });
  if (apiKey) {
    const res = await api("/api/v1/workspace");
    if (!res.ok) throw new Error(`Kelados workspace sync failed: ${res.status} ${(await res.json().catch(() => ({}))).error || ""}`);
    workspace = await res.json();
  }

  const resolve = (opts = {}) => {
    const preset = opts.preset && workspace.presets.find((p) => p.name === opts.preset || p._id === opts.preset);
    if (opts.preset && !preset) throw new Error(`Unknown preset "${opts.preset}"`);
    const voice = opts.voice || preset?.voice || "af_heart";
    if (!(voice in tts.voices)) throw new Error(`Unknown voice "${voice}". See client.voices`);
    return { voice, speed: opts.speed ?? preset?.speed ?? 1 };
  };

  const report = (characters, seconds) => {
    if (apiKey) api("/api/usage", { method: "POST", body: JSON.stringify({ characters, seconds, source: "sdk" }) }).catch(() => {});
  };

  /** Yields { text, audio: Float32Array, sampleRate } sentence by sentence. */
  async function* stream(text, opts) {
    const { voice, speed } = resolve(opts);
    let samples = 0, rate = 24000;
    // kokoro-js never closes the splitter for plain-string input (hangs on the last sentence), so feed it a closed stream.
    const splitter = new TextSplitterStream();
    splitter.push(applyLexicon(text, workspace.lexicon));
    splitter.close();
    for await (const { text: t, audio } of tts.stream(splitter, { voice, speed })) {
      samples += audio.audio.length; rate = audio.sampling_rate;
      yield { text: t, audio: audio.audio, sampleRate: audio.sampling_rate };
    }
    report(text.length, samples / rate);
  }

  /** Synthesize any length of text into one clip. */
  async function speak(text, opts) {
    const chunks = [];
    let sampleRate = 24000;
    for await (const c of stream(text, opts)) { chunks.push(c.audio); sampleRate = c.sampleRate; }
    const audio = concat(chunks);
    return {
      audio, sampleRate, duration: audio.length / sampleRate,
      toWav: () => encodeWav(audio, sampleRate),
      save: (path) => writeFile(path, encodeWav(audio, sampleRate)),
    };
  }

  return { speak, stream, voices: tts.voices, get presets() { return workspace.presets; }, get lexicon() { return workspace.lexicon; } };
}

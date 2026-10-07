export function concatAudio(parts: { audio: Float32Array; pauseAfter?: number }[], sampleRate: number) {
  const total = parts.reduce((n, p) => n + p.audio.length + Math.round((p.pauseAfter ?? 0) * sampleRate), 0);
  const out = new Float32Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p.audio, o);
    o += p.audio.length + Math.round((p.pauseAfter ?? 0) * sampleRate);
  }
  return out;
}

/** Mono float samples → 16-bit PCM WAV blob. */
export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const view = new DataView(new ArrayBuffer(44 + samples.length * 2));
  const str = (o: number, s: string) => [...s].forEach((c, i) => view.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF"); view.setUint32(4, 36 + samples.length * 2, true); str(8, "WAVE");
  str(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  str(36, "data"); view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 32767, true);
  return new Blob([view], { type: "audio/wav" });
}

/** Decode any browser-playable file and resample to mono at `rate` (Whisper wants 16 kHz). */
export async function decodeToMono(file: Blob, rate = 16000) {
  const ctx = new AudioContext();
  const decoded = await ctx.decodeAudioData(await file.arrayBuffer());
  await ctx.close();
  const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * rate), rate);
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination);
  src.start();
  return (await offline.startRendering()).getChannelData(0);
}

export function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

export function download(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "kelados";

/** Pronunciation rules, whole-word and case-insensitive (same logic as the SDK). */
export function applyLexicon(text: string, rules: { from: string; to: string }[] = []) {
  return rules.reduce((t, { from, to }) =>
    t.replace(new RegExp(`(?<!\\w)${from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?!\\w)`, "gi"), to), text);
}

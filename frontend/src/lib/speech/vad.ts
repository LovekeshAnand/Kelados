// Voice activity detection and audio segmenting for 16 kHz mono speech.
// Pure functions over Float32Arrays, no audio APIs, so they run unchanged in tests and workers.

export const RATE = 16000;
const WIN = 320; // 20 ms analysis window

export type Segment = { audio: Float32Array; start: number; end: number }; // seconds since the stream started

export type VadOptions = {
  /** Calibration knob: >1 catches quieter speech, <1 ignores more background noise. */
  sensitivity?: number;
  /** End a segment after this much silence. Shorter = snappier dictation, longer = fewer mid-sentence cuts. */
  silenceMs?: number;
  /** Force-cut long monologues so text keeps flowing. */
  maxMs?: number;
  /** Ignore clicks and coughs shorter than this. */
  minSpeechMs?: number;
  /** Audio kept from just before speech began so first syllables aren't clipped. */
  prerollMs?: number;
  /** How often to emit the in-progress segment for live preview. 0 disables partials. */
  partialMs?: number;
};

export type VadEvents = {
  onSegment: (s: Segment) => void;
  onPartial?: (audio: Float32Array) => void;
  onSpeech?: (speaking: boolean) => void;
  onLevel?: (rms: number) => void;
};

const rmsOf = (a: Float32Array, from: number, to: number) => {
  let s = 0;
  for (let i = from; i < to; i++) s += a[i] * a[i];
  return Math.sqrt(s / Math.max(1, to - from));
};

export function concat(parts: Float32Array[]) {
  const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

export function createVad(opts: VadOptions, ev: VadEvents) {
  const { sensitivity = 1, silenceMs = 600, maxMs = 20000, minSpeechMs = 250, prerollMs = 500, partialMs = 900 } = opts;
  const winMs = (WIN / RATE) * 1000;
  let floor = 0.002;
  let speaking = false;
  let buf: Float32Array[] = [];
  let preroll: Float32Array[] = [];
  let speechMs = 0, silentMs = 0, segMs = 0, sincePartial = 0;
  let segStart = 0;
  let t = 0; // samples consumed
  let pending = new Float32Array(0);

  const end = () => {
    if (speechMs >= minSpeechMs) {
      // Keep ~650 ms of the "silence": quiet word endings (the t in "start", a fading "lunch") fall under the threshold too.
      const trim = Math.max(0, Math.round(((silentMs - 650) / 1000) * RATE));
      const audio = concat(buf);
      const cut = audio.subarray(0, Math.max(0, audio.length - trim));
      ev.onSegment({ audio: cut, start: segStart / RATE, end: (segStart + cut.length) / RATE });
    }
    buf = []; speechMs = 0; silentMs = 0; segMs = 0; sincePartial = 0;
  };

  const step = (w: Float32Array) => {
    const rms = rmsOf(w, 0, w.length);
    ev.onLevel?.(rms);
    const threshold = Math.max(floor * 3, 0.006) / sensitivity;
    const voiced = rms > threshold;
    // Noise floor follows quiet stretches quickly and loud ones slowly, so speech doesn't raise it.
    if (!speaking || !voiced) floor = rms < floor ? 0.8 * floor + 0.2 * rms : 0.995 * floor + 0.005 * rms;
    floor = Math.max(floor, 0.0005);

    if (!speaking) {
      preroll.push(w);
      if (preroll.length * winMs > prerollMs) preroll.shift();
      if (voiced) {
        speaking = true;
        buf = preroll;
        preroll = [];
        segStart = t + w.length - buf.reduce((n, p) => n + p.length, 0);
        speechMs = winMs;
        segMs = buf.length * winMs;
        ev.onSpeech?.(true);
      }
    } else {
      buf.push(w);
      segMs += winMs;
      sincePartial += winMs;
      if (voiced) { speechMs += winMs; silentMs = 0; } else silentMs += winMs;
      if (silentMs >= silenceMs) {
        end();
        speaking = false;
        ev.onSpeech?.(false);
      } else if (segMs >= maxMs) {
        end();
        segStart = t + w.length;
      } else if (opts.partialMs !== 0 && ev.onPartial && sincePartial >= partialMs && speechMs >= minSpeechMs) {
        sincePartial = 0;
        ev.onPartial(concat(buf));
      }
    }
    t += w.length;
  };

  return {
    /** Feed audio of any length; it is analysed in 20 ms windows. */
    push(frame: Float32Array) {
      const all = pending.length ? concat([pending, frame]) : frame;
      let i = 0;
      for (; i + WIN <= all.length; i += WIN) step(all.slice(i, i + WIN));
      pending = all.slice(i);
    },
    /** Emit whatever is in progress (call when the stream stops). */
    flush() {
      if (speaking) { end(); speaking = false; ev.onSpeech?.(false); }
    },
  };
}

/**
 * Split long audio into pieces of at most `maxS` seconds, cutting at the quietest
 * 100 ms after `minS`, so words are not chopped at a hard 30 s boundary.
 */
export function splitAtSilence(audio: Float32Array, maxS = 28, minS = 18, rate = RATE): { audio: Float32Array; start: number }[] {
  const out: { audio: Float32Array; start: number }[] = [];
  const max = maxS * rate, min = minS * rate, hop = rate / 10;
  let from = 0;
  while (audio.length - from > max) {
    let best = from + max, bestRms = Infinity;
    for (let i = from + min; i + hop <= from + max; i += hop) {
      const r = rmsOf(audio, i, i + hop);
      if (r < bestRms) { bestRms = r; best = i + hop / 2; }
    }
    best = Math.round(best);
    out.push({ audio: audio.subarray(from, best), start: from / rate });
    from = best;
  }
  out.push({ audio: audio.subarray(from), start: from / rate });
  return out;
}

/** Box-filter downsample, good enough for speech going into an ASR model. */
export function downsample(input: Float32Array, from: number, to = RATE) {
  if (from === to) return input;
  const ratio = from / to;
  const out = new Float32Array(Math.floor(input.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const a = Math.floor(i * ratio), b = Math.min(input.length, Math.floor((i + 1) * ratio));
    let s = 0;
    for (let j = a; j < b; j++) s += input[j];
    out[i] = s / Math.max(1, b - a);
  }
  return out;
}

/** Whisper invents text for silence and noise; drop the usual suspects. */
export function isHallucination(text: string, seconds: number) {
  const t = text.trim();
  if (!t || /^[\s.,!?…-]*$/.test(t)) return true;
  if (/^[[(].*[\])]$/.test(t)) return true; // [BLANK_AUDIO], (music), [Applause]
  return /^(thanks for watching|subtitles by .*)[.!]?$/i.test(t) || (seconds < 2.5 && /^you[.!]?$/i.test(t));
}

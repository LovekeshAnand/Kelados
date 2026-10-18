"use client";
// Real-time transcription: MediaStream → AudioWorklet → VAD → STT worker.
// Text for a phrase arrives ~0.3–1 s after you stop speaking; previews stream while you talk.
import { createVad, downsample, isHallucination, RATE, type VadOptions } from "@/lib/speech/vad";
import { sttBusy, transcribe } from "./stt";

export type LiveFinal = { text: string; start: number; end: number };
export type LiveOptions = {
  model: string;
  language?: string | null;
  vad?: VadOptions;
  onPartial?: (text: string) => void;
  onFinal: (f: LiveFinal) => void;
  onSpeech?: (speaking: boolean) => void;
  onLevel?: (rms: number) => void;
  onError?: (e: Error) => void;
  /** Audio from just before the user pressed start (Rewind's buffer), so a first word said early isn't lost. */
  prime?: Float32Array;
};

// Batches 128-sample render quanta into ~128 ms posts to keep main-thread messages cheap.
const TAP = `class Tap extends AudioWorkletProcessor {
  constructor() { super(); this.parts = []; this.n = 0; }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) {
      this.parts.push(ch.slice()); this.n += ch.length;
      if (this.n >= sampleRate / 8) {
        const out = new Float32Array(this.n); let o = 0;
        for (const p of this.parts) { out.set(p, o); o += p.length; }
        this.port.postMessage(out, [out.buffer]); this.parts = []; this.n = 0;
      }
    }
    return true;
  }
}
registerProcessor("kelados-tap", Tap);`;
let tapUrl: string | null = null;

/** Mic constraints tuned for speech: the browser's echo cancellation keeps meeting audio out of your mic track. */
export const micStream = () => navigator.mediaDevices.getUserMedia({
  audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
});

/** Mic → 16 kHz mono chunks of ~128 ms, until `stop()`. Shared by live dictation and Rewind's rolling buffer. */
export async function tapStream(stream: MediaStream, onAudio: (chunk: Float32Array) => void) {
  let ctx: AudioContext;
  try { ctx = new AudioContext({ sampleRate: RATE }); } catch { ctx = new AudioContext(); }
  tapUrl ??= URL.createObjectURL(new Blob([TAP], { type: "text/javascript" }));
  let src: MediaStreamAudioSourceNode;
  try {
    await ctx.audioWorklet.addModule(tapUrl);
    src = ctx.createMediaStreamSource(stream);
  } catch {
    // Firefox can't connect a mic to a context at a different rate; fall back to the native rate and resample.
    await ctx.close();
    ctx = new AudioContext();
    await ctx.audioWorklet.addModule(tapUrl);
    src = ctx.createMediaStreamSource(stream);
  }
  const tap = new AudioWorkletNode(ctx, "kelados-tap");
  const mute = ctx.createGain();
  mute.gain.value = 0;
  src.connect(tap).connect(mute).connect(ctx.destination); // must reach the destination to be pulled
  tap.port.onmessage = ({ data }) => onAudio(downsample(data, ctx.sampleRate));
  return {
    async stop() {
      tap.port.onmessage = null;
      src.disconnect();
      await ctx.close();
    },
  };
}

export async function startLive(stream: MediaStream, o: LiveOptions) {
  let seg = 0; // id of the phrase being spoken; stale previews for finished phrases are dropped
  let finals = Promise.resolve();
  const opts = { model: o.model, language: o.language };

  const vad = createVad(o.vad ?? {}, {
    onSpeech: o.onSpeech,
    onLevel: o.onLevel,
    onPartial: (audio) => {
      if (!o.onPartial || sttBusy()) return;
      const mine = seg;
      transcribe(audio, opts).then((r) => { if (mine === seg && r.text) o.onPartial!(r.text); }, () => {});
    },
    onSegment: ({ audio, start, end }) => {
      seg++;
      const p = transcribe(audio, opts);
      // Chain so results are delivered in speaking order even if a later one resolves first.
      finals = finals.then(() => p).then((r) => {
        if (!isHallucination(r.text, end - start)) o.onFinal({ text: r.text, start, end });
      }, (e) => o.onError?.(e));
    },
  });
  if (o.prime?.length) vad.push(o.prime);
  const tap = await tapStream(stream, (chunk) => vad.push(chunk));

  return {
    /** Stop listening; resolves once the last phrase has been transcribed. */
    async stop() {
      await tap.stop();
      vad.flush();
      await finals;
    },
  };
}

export type LiveSession = Awaited<ReturnType<typeof startLive>>;

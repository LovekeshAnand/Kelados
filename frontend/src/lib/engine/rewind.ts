"use client";
// Rewind: the mic keeps the last 30 seconds in memory, so you can press the shortcut *after* you've said something
// and still get it typed. Audio lives only in this array: never saved, never sent. Cloud dictation can't offer this
// without streaming every second of your day to a server.
import { concat, createVad, isHallucination, RATE } from "@/lib/speech/vad";
import { tapStream } from "./live";
import { transcribe } from "./stt";

export const REWIND_SECONDS = 30;

export async function startRewind(stream: MediaStream, seconds = REWIND_SECONDS) {
  let parts: Float32Array[] = [];
  let n = 0;
  const tap = await tapStream(stream, (chunk) => {
    parts.push(chunk);
    n += chunk.length;
    while (parts.length > 1 && n - parts[0].length >= seconds * RATE) n -= parts.shift()!.length;
  });
  return {
    /** The last `s` seconds heard since the last `clear()`. */
    take(s = seconds) {
      const all = concat(parts);
      return all.subarray(Math.max(0, all.length - s * RATE));
    },
    /** Forget what's buffered, e.g. once it has been dictated, so it's never typed twice. */
    clear() { parts = []; n = 0; },
    stop: tap.stop,
  };
}

export type Rewind = Awaited<ReturnType<typeof startRewind>>;

/** Cut buffered audio into phrases at the pauses and transcribe them in order. Returns the phrases and seconds of speech. */
export async function transcribeBuffer(audio: Float32Array, o: { model: string; language?: string | null; sensitivity?: number }) {
  const segs: { audio: Float32Array; start: number; end: number }[] = [];
  const vad = createVad({ sensitivity: o.sensitivity ?? 1, partialMs: 0 }, { onSegment: (s) => segs.push(s) });
  vad.push(audio);
  vad.flush();
  const texts: string[] = [];
  let seconds = 0;
  for (const s of segs) {
    const r = await transcribe(s.audio, { model: o.model, language: o.language });
    if (isHallucination(r.text, s.end - s.start)) continue;
    texts.push(r.text);
    seconds += s.end - s.start;
  }
  return { texts, seconds };
}

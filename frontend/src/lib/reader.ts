"use client";
// Read aloud with a live position: each sentence is scheduled on the audio clock as soon as it's synthesized, so we know
// exactly which sentence is playing, how far in we are, and roughly how long the whole text will take.
import { useSyncExternalStore } from "react";
import { synthesize } from "@/lib/engine/tts";

export type Reading = {
  status: "idle" | "preparing" | "playing" | "buffering";
  sentence: string;
  elapsed: number; // seconds of speech played
  total: number; // seconds: what's generated so far plus an estimate for the rest
};

const IDLE: Reading = { status: "idle", sentence: "", elapsed: 0, total: 0 };
let state = IDLE;
const listeners = new Set<() => void>();
const set = (s: Reading) => { state = s; listeners.forEach((l) => l()); };
let stopCurrent: (() => void) | null = null;

export function stopReading() {
  stopCurrent?.();
  stopCurrent = null;
  set(IDLE);
}

export function readAloud(text: string, voice = "af_heart", speed = 1) {
  stopReading();
  const ctx = new AudioContext();
  const abort = new AbortController();
  const parts: { start: number; end: number; text: string }[] = [];
  let next = ctx.currentTime + 0.05, chars = 0, done = false;
  // Before any audio exists, guess from typical speaking speed (~15 characters a second).
  set({ status: "preparing", sentence: "", elapsed: 0, total: text.length / 15 / speed });

  synthesize(text, {
    voice, speed, signal: abort.signal,
    onChunk: (c) => {
      if (ctx.state === "closed") return;
      const buf = ctx.createBuffer(1, c.audio.length, c.sampleRate);
      buf.copyToChannel(new Float32Array(c.audio), 0);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      const start = Math.max(next, ctx.currentTime + 0.02);
      src.start(start);
      parts.push({ start, end: start + buf.duration, text: c.text });
      next = start + buf.duration;
      chars += c.text.length;
    },
  }).then(() => { done = true; }, () => { done = true; });

  const timer = setInterval(() => {
    if (!parts.length) return; // still preparing the voice or the first sentence
    const now = ctx.currentTime, first = parts[0].start;
    const playing = parts.find((p) => now >= p.start && now < p.end);
    if (done && now >= next) return stopReading(); // finished
    const generated = next - first;
    const rest = done ? 0 : Math.max(0, text.length - chars) * (generated / Math.max(1, chars)); // measured voice speed
    set({
      status: playing ? "playing" : "buffering", // buffering: synthesis fell behind playback for a moment
      sentence: (playing ?? parts[parts.length - 1]).text,
      elapsed: Math.min(Math.max(0, now - first), generated),
      total: generated + rest,
    });
  }, 100);

  stopCurrent = () => { clearInterval(timer); abort.abort(); if (ctx.state !== "closed") ctx.close(); };
}

export function useReading() {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => state, () => IDLE);
}

"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { micStream, startLive, type LiveSession } from "@/lib/engine/live";
import { loadStt, warmStt } from "@/lib/engine/stt";
import { cleanup, type CleanupOptions } from "./cleanup";

export type DictationStatus = "idle" | "starting" | "listening" | "finishing";

export type DictationOptions = CleanupOptions & {
  model: string;
  language?: string | null;
  sensitivity?: number;
  /** "cached" (default): warm the model on open only if it's already downloaded. "always": download now. "never": wait for the mic. */
  preload?: "cached" | "always" | "never";
  /** Runs on each cleaned phrase, e.g. fixes learned from your own writing. */
  transform?: (text: string) => string;
  /** Audio from just before start (Rewind's buffer), fed in first so early words aren't clipped. */
  prime?: () => Float32Array | undefined;
  /** A cleaned phrase is ready. `undoPrevious` means the user said "scratch that". `seconds` is how long it took to say. */
  onText: (text: string, undoPrevious: boolean, seconds: number) => void;
};

/** Microphone → live STT → rule-based cleanup, as a start/stop hook. */
export function useDictation(o: DictationOptions) {
  const [status, setStatus] = useState<DictationStatus>("idle");
  const [partial, setPartial] = useState("");
  const [level, setLevel] = useState(0);
  const [error, setError] = useState("");
  const session = useRef<{ live: LiveSession; stream: MediaStream } | null>(null);
  const opts = useRef(o);
  useLayoutEffect(() => { opts.current = o; });

  // Warm the model when the page opens so the first press is instant, without downloading anything unasked.
  useEffect(() => {
    if (o.preload === "always") loadStt(o.model);
    else if (o.preload !== "never") warmStt(o.model);
  }, [o.model, o.preload]);

  const starting = useRef(false);
  const start = useCallback(async () => {
    // `session` is only set once the mic is open, so a second press while starting must be refused here.
    if (session.current || starting.current) return;
    starting.current = true;
    setError(""); setStatus("starting");
    let stream: MediaStream | null = null;
    try {
      stream = await micStream();
      const live = await startLive(stream, {
        model: opts.current.model,
        language: opts.current.language,
        // A phrase ends after 0.8 s of quiet (longer than a breath inside a sentence) (or when you press stop), so whole sentences reach the model together: it
        // hears "schedule the meeting" in context instead of guessing at a fragment. Live previews refresh as fast as the
        // model allows: every 0.35 s on Moonshine (~0.2 s each), every 1.5 s on the slower Whisper models.
        vad: { sensitivity: opts.current.sensitivity ?? 1, silenceMs: 800, maxMs: 20000, partialMs: opts.current.model.includes("moonshine") ? 350 : 1500 },
        prime: opts.current.prime?.(),
        onPartial: setPartial,
        onLevel: setLevel,
        onFinal: ({ text, start, end }) => {
          setPartial("");
          const { fillers, commands, snippets } = opts.current;
          const r = cleanup(text, { fillers, commands, snippets });
          const out = r.text && opts.current.transform ? opts.current.transform(r.text) : r.text;
          if (out || r.undoPrevious) opts.current.onText(out, r.undoPrevious, end - start);
        },
        onError: (e) => setError(e.message),
      });
      session.current = { live, stream };
      starting.current = false;
      setStatus("listening");
    } catch (e) {
      stream?.getTracks().forEach((t) => t.stop());
      starting.current = false;
      setError((e as Error).name === "NotAllowedError" ? "Microphone access was blocked. Allow it in the address bar and try again." : (e as Error).message);
      setStatus("idle");
    }
  }, []);

  const stop = useCallback(async () => {
    const s = session.current;
    if (!s) return;
    session.current = null;
    setStatus("finishing");
    s.stream.getTracks().forEach((t) => t.stop());
    await s.live.stop().catch(() => {});
    setPartial(""); setLevel(0); setStatus("idle");
  }, []);

  useEffect(() => () => { void stop(); }, [stop]);

  return { status, partial, level, error, start, stop, toggle: () => (session.current ? stop() : start()) };
}

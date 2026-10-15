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
  /** A cleaned phrase is ready. `undoPrevious` means the user said "scratch that". */
  onText: (text: string, undoPrevious: boolean) => void;
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

  const start = useCallback(async () => {
    if (session.current) return;
    setError(""); setStatus("starting");
    let stream: MediaStream | null = null;
    try {
      stream = await micStream();
      const live = await startLive(stream, {
        model: opts.current.model,
        language: opts.current.language,
        vad: { sensitivity: opts.current.sensitivity ?? 1, silenceMs: 550 },
        onPartial: setPartial,
        onLevel: setLevel,
        onFinal: ({ text }) => {
          setPartial("");
          const { fillers, commands, snippets } = opts.current;
          const r = cleanup(text, { fillers, commands, snippets });
          if (r.text || r.undoPrevious) opts.current.onText(r.text, r.undoPrevious);
        },
        onError: (e) => setError(e.message),
      });
      session.current = { live, stream };
      setStatus("listening");
    } catch (e) {
      stream?.getTracks().forEach((t) => t.stop());
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

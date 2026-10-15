"use client";
import { useEffect } from "react";
import { hasModel } from "@/lib/engine/cache";
import { loadEngine, setDevicePref, TTS_MODEL, useEngine } from "@/lib/engine/tts";

/** Model download/readiness bar with a GPU ↔ CPU switch. */
export function EngineStatus({ autoload = true }: { autoload?: boolean }) {
  const s = useEngine();
  // Warm from disk if the voice model is already here; a first download waits for the first Generate.
  useEffect(() => {
    if (autoload && s.status === "idle") hasModel(TTS_MODEL).then((cached) => { if (cached) loadEngine().catch(() => {}); });
  }, [autoload, s.status]);

  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className={`size-2 rounded-full ${s.status === "ready" ? "bg-ok" : s.status === "error" ? "bg-danger" : "animate-pulse bg-accent"}`} />
        <span className="text-fg">
          {s.status === "ready" && <>Engine ready <span className="text-muted">· {s.device === "webgpu" ? "WebGPU" : "CPU (WASM)"}</span></>}
          {s.status === "loading" && (s.progress >= 0.99
            ? <>Warming up voice model <span className="text-muted">· a few seconds</span></>
            : <>Loading voice model <span className="text-muted">· {Math.round(s.progress * 100)}%</span></>)}
          {s.status === "idle" && <>Voice model not loaded <span className="text-muted">· downloads once when you first generate, then stays on this device</span></>}
          {s.status === "error" && <span className="text-danger">Engine error: {s.error}</span>}
        </span>
        {s.status === "error" && <button className="text-sm text-accent hover:underline" onClick={() => setDevicePref("wasm")}>Retry on CPU</button>}
        <div className="ml-auto flex rounded-lg border border-line p-0.5 text-xs" role="group" aria-label="Compute device">
          {(["auto", "wasm"] as const).map((p) => (
            <button key={p} onClick={() => setDevicePref(p)} aria-pressed={s.pref === p}
              className={`rounded-md px-2.5 py-1 transition-colors ${s.pref === p ? "bg-elevated text-fg" : "text-muted hover:text-fg"}`}>
              {p === "auto" ? "GPU if available" : "CPU only"}
            </button>
          ))}
        </div>
      </div>
      {s.status === "loading" && (
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-line">
          <div className="h-full bg-accent transition-all" style={{ width: `${s.progress * 100}%` }} />
        </div>
      )}
      <p className="mt-2 text-xs text-subtle">
        Runs entirely on your device. The voice model downloads once and stays: 326 MB for GPU, or 92 MB with &ldquo;CPU only&rdquo; (smaller download, slower on long texts).
      </p>
    </div>
  );
}

"use client";
import { sttModel, useStt } from "@/lib/engine/stt";

/** Speech-recognition model download and readiness, in one line. */
export function SttStatus() {
  const s = useStt();
  const name = s.model ? sttModel(s.model).name : "Speech model";
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-2 font-mono text-[11px] text-muted">
        <span className={`size-1.5 rounded-full ${s.status === "ready" ? "bg-ok" : s.status === "error" ? "bg-danger" : "animate-pulse bg-accent"}`} />
        {s.status === "ready" && <>{name} ready · {s.device === "webgpu" ? "WebGPU" : "CPU"}</>}
        {s.status === "loading" && (s.progress >= 0.99
          ? <>Warming up {name} · a few seconds, once per visit</>
          : <>Loading {name} · {Math.round(s.progress * 100)}% · cached after the first time</>)}
        {s.status === "idle" && <>{name} idle</>}
        {s.status === "error" && <span className="text-danger">{s.error}</span>}
      </p>
      {s.status === "loading" && (
        <div className="h-0.5 overflow-hidden bg-line"><div className="h-full bg-accent transition-all" style={{ width: `${s.progress * 100}%` }} /></div>
      )}
    </div>
  );
}

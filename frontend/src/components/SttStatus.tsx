"use client";
import { sttModel, useStt } from "@/lib/engine/stt";

/** Speech-recognition model state, in one honest line: on disk, downloading, or not downloaded yet. */
export function SttStatus() {
  const s = useStt();
  const m = s.model ? sttModel(s.model) : null;
  const name = m?.name ?? "Speech model";
  const size = m?.note.match(/[\d–]+ MB/)?.[0];
  const downloading = s.status === "loading" && s.cached === false && s.progress < 0.99;
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-2 font-mono text-[11px] text-muted">
        <span className={`size-1.5 rounded-full ${s.status === "ready" ? "bg-ok" : s.status === "error" ? "bg-danger" : s.status === "idle" ? "bg-line-strong" : "animate-pulse bg-accent"}`} />
        {s.status === "ready" && <>{name} ready · {s.device === "webgpu" ? "WebGPU" : "CPU"}</>}
        {s.status === "loading" && (downloading
          ? <>Downloading {name} · {Math.round(s.progress * 100)}% · one time only</>
          : <>Loading {name} from this device…</>)}
        {s.status === "idle" && <>{name} · downloads once when you start{size && ` (${size})`}, then stays on this device</>}
        {s.status === "error" && <span className="text-danger">{s.error}</span>}
      </p>
      {downloading && (
        <div className="h-0.5 overflow-hidden bg-line"><div className="h-full bg-accent transition-all" style={{ width: `${s.progress * 100}%` }} /></div>
      )}
    </div>
  );
}

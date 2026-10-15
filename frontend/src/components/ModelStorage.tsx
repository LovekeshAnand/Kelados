"use client";
import { useEffect, useState } from "react";
import { cachedModels, deleteModel, storageUsage, type CachedModel } from "@/lib/engine/cache";
import { sttModel, STT_MODELS } from "@/lib/engine/stt";
import { TTS_MODEL } from "@/lib/engine/tts";
import { historyDb } from "@/lib/local-db";
import { btn, Spinner } from "./ui";

const mb = (n: number) => (n >= 1e9 ? `${(n / 1e9).toFixed(1)} GB` : `${Math.max(1, Math.round(n / 1e6))} MB`);
const label = (id: string) =>
  id === TTS_MODEL ? "Kokoro voices (text to speech)" : STT_MODELS.some((m) => m.id === id) ? `${sttModel(id).name} (speech to text)` : id.split("/")[1];

/** What Kelados keeps on this device, and a way to free it. Models re-download only if removed. */
export function ModelStorage() {
  const [models, setModels] = useState<CachedModel[] | null>(null);
  const [usage, setUsage] = useState(0);
  const [clips, setClips] = useState(0);
  const [busy, setBusy] = useState("");

  const [tick, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);
  useEffect(() => {
    let live = true;
    Promise.all([cachedModels(), storageUsage(), historyDb.list().catch(() => [])]).then(([m, u, h]) => {
      if (!live) return;
      setModels(m.filter((x) => x.id.includes("/")));
      setUsage(u);
      setClips(h.length);
    });
    return () => { live = false; };
  }, [tick]);

  const remove = async (id: string) => {
    setBusy(id);
    try { await deleteModel(id); } finally { setBusy(""); refresh(); }
  };

  return (
    <div className="space-y-3 text-sm">
      <p className="text-xs text-muted">
        Models download once and stay on this device, so they load in seconds next time. Using {mb(usage)} in total.
      </p>
      {models === null ? <Spinner /> : models.length === 0 ? (
        <p className="text-xs text-subtle">No models downloaded yet.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {models.map((m) => (
            <li key={m.id} className="flex items-center gap-3 py-2">
              <span className="min-w-0 flex-1 truncate">{label(m.id)}</span>
              {m.bytes ? <span className="font-mono text-[11px] text-subtle">{mb(m.bytes)}</span> : null}
              <button className={btn("ghost", "sm")} disabled={!!busy} onClick={() => remove(m.id)}>{busy === m.id ? "Removing…" : "Remove"}</button>
            </li>
          ))}
        </ul>
      )}
      {clips > 0 && (
        <div className="flex items-center gap-3">
          <span className="flex-1 text-xs text-muted">{clips} saved studio clip{clips === 1 ? "" : "s"} (latest 50 are kept)</span>
          <button className={btn("ghost", "sm")} onClick={() => historyDb.clear().then(refresh)}>Clear</button>
        </div>
      )}
    </div>
  );
}

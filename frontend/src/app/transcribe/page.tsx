"use client";
import { useEffect, useRef, useState } from "react";
import { decodeToMono, download } from "@/lib/audio";
import { btn, card, PageHero, Spinner } from "@/components/ui";

type Chunk = { text: string; timestamp: [number, number | null] };

const MODELS = [
  ["onnx-community/whisper-tiny.en", "Tiny · English", "~40 MB, fastest"],
  ["onnx-community/whisper-base", "Base · 99 languages", "~80 MB, balanced"],
  ["onnx-community/whisper-small", "Small · 99 languages", "~250 MB, most accurate"],
] as const;

const stamp = (s: number, sep: "," | ".") => {
  const ms = Math.round(s * 1000);
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)}${sep}${p(ms % 1000, 3)}`;
};
const toSrt = (c: Chunk[]) => c.map((x, i) => `${i + 1}\n${stamp(x.timestamp[0], ",")} --> ${stamp(x.timestamp[1] ?? x.timestamp[0] + 2, ",")}\n${x.text.trim()}\n`).join("\n");
const toVtt = (c: Chunk[]) => "WEBVTT\n\n" + c.map((x) => `${stamp(x.timestamp[0], ".")} --> ${stamp(x.timestamp[1] ?? x.timestamp[0] + 2, ".")}\n${x.text.trim()}\n`).join("\n");

export default function TranscribePage() {
  const worker = useRef<Worker | null>(null);
  const files = useRef(new Map<string, number[]>());
  const [model, setModel] = useState<string>(MODELS[1][0]);
  const [task, setTask] = useState<"transcribe" | "translate">("transcribe");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ text: string; chunks: Chunk[] } | null>(null);
  const [error, setError] = useState("");
  const [recording, setRecording] = useState<MediaRecorder | null>(null);

  useEffect(() => () => worker.current?.terminate(), []);

  const run = async (f: Blob) => {
    setBusy(true); setError(""); setResult(null); setProgress(0); setStatus("Decoding audio…");
    try {
      const audio = await decodeToMono(f, 16000);
      if (!worker.current) {
        worker.current = new Worker("/workers/stt.js", { type: "module" });
        worker.current.onmessage = ({ data }) => {
          if (data.type === "progress") {
            files.current.set(data.file, [data.loaded, data.total]);
            let l = 0, t = 0;
            files.current.forEach(([a, b]) => { l += a; t += b; });
            setProgress(t ? l / t : 0);
            setStatus("Downloading Whisper (once)…");
          } else if (data.type === "status") setStatus(data.message);
          else if (data.type === "result") { setResult({ text: data.text, chunks: data.chunks }); setBusy(false); setStatus(""); }
          else if (data.type === "error") { setError(data.message); setBusy(false); setStatus(""); }
        };
      }
      setStatus("Loading model…");
      worker.current.postMessage({ type: "transcribe", audio, model, task }, [audio.buffer]);
    } catch (e) {
      setError(`Couldn't read that file: ${(e as Error).message}`);
      setBusy(false); setStatus("");
    }
  };

  const toggleRecord = async () => {
    if (recording) { recording.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const parts: Blob[] = [];
      rec.ondataavailable = (e) => parts.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(null);
        const blob = new Blob(parts, { type: rec.mimeType });
        setFile(new File([blob], "recording.webm", { type: rec.mimeType }));
        run(blob);
      };
      rec.start();
      setRecording(rec);
    } catch { setError("Microphone access was blocked."); }
  };

  return (
    <>
      <PageHero kicker="Speech to text" title="Transcribe audio and video," accent="privately.">
        Get transcripts and SRT/VTT subtitles in 99 languages, or translate into English. Whisper runs in your browser, so nothing is uploaded.
      </PageHero>

      <section className="mx-auto grid max-w-6xl gap-6 px-5 py-10 md:px-8 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-5">
          <label onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
            className="flex min-h-52 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong bg-surface p-8 text-center transition-colors hover:border-fg/40">
            <svg viewBox="0 0 24 24" className="size-7 text-muted" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></svg>
            <span className="font-medium">{file ? file.name : "Drop an audio or video file"}</span>
            <span className="text-xs text-muted">{file ? `${(file.size / 1e6).toFixed(1)} MB · click to change` : "MP3, WAV, M4A, OGG, WebM, MP4 · any length"}</span>
            <input type="file" accept="audio/*,video/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>

          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">Model</legend>
            {MODELS.map(([id, name, note]) => (
              <label key={id} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors ${model === id ? "border-accent/50 bg-accent-soft" : "border-line hover:border-line-strong"}`}>
                <input type="radio" name="model" checked={model === id} onChange={() => setModel(id)} className="accent-accent" />
                <span>{name}</span><span className="ml-auto text-xs text-muted">{note}</span>
              </label>
            ))}
          </fieldset>

          {!model.endsWith(".en") && (
            <div className="flex rounded-lg border border-line p-0.5 text-sm" role="group">
              {(["transcribe", "translate"] as const).map((t) => (
                <button key={t} onClick={() => setTask(t)} aria-pressed={task === t} className={`flex-1 rounded-md py-1.5 transition-colors ${task === t ? "bg-elevated text-fg" : "text-muted"}`}>
                  {t === "transcribe" ? "Original language" : "Translate to English"}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button className={btn("primary", "md")} disabled={!file || busy} onClick={() => file && run(file)}>Transcribe</button>
            <button className={btn(recording ? "danger" : "secondary", "md")} disabled={busy && !recording} onClick={toggleRecord}>
              {recording ? "Stop recording" : "Record from microphone"}
            </button>
          </div>
          {status && (
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-sm text-muted"><Spinner /> {status}</p>
              {progress > 0 && progress < 1 && <div className="h-1 overflow-hidden rounded-full bg-line"><div className="h-full bg-accent" style={{ width: `${progress * 100}%` }} /></div>}
            </div>
          )}
          {error && <p className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{error}</p>}
        </div>

        <div className={`${card} min-h-96 p-5`}>
          {!result && <div className="grid h-full place-items-center text-center text-sm text-subtle">Your transcript will appear here.</div>}
          {result && (
            <>
              <div className="flex flex-wrap gap-2">
                <button className={btn("secondary", "sm")} onClick={() => navigator.clipboard.writeText(result.text)}>Copy</button>
                <button className={btn("ghost", "sm")} onClick={() => download(new Blob([result.text]), "transcript.txt")}>.txt</button>
                <button className={btn("ghost", "sm")} onClick={() => download(new Blob([toSrt(result.chunks)]), "subtitles.srt")}>.srt</button>
                <button className={btn("ghost", "sm")} onClick={() => download(new Blob([toVtt(result.chunks)]), "subtitles.vtt")}>.vtt</button>
              </div>
              <ol className="mt-5 max-h-[32rem] space-y-3 overflow-y-auto">
                {result.chunks.map((c, i) => (
                  <li key={i} className="grid grid-cols-[3.5rem_1fr] gap-3 text-sm">
                    <span className="font-mono text-xs text-subtle">{stamp(c.timestamp[0], ".").slice(3, 8)}</span>
                    <span className="leading-relaxed">{c.text.trim()}</span>
                  </li>
                ))}
                {!result.chunks.length && <li className="text-sm">{result.text}</li>}
              </ol>
            </>
          )}
        </div>
      </section>
    </>
  );
}

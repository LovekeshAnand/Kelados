"use client";
import { useEffect, useRef, useState } from "react";
import { SttStatus } from "@/components/SttStatus";
import { btn, card, PageHero, Spinner } from "@/components/ui";
import { decodeToMono, download } from "@/lib/audio";
import { FILE_MODEL, loadStt, STT_MODELS, sttModel, transcribe } from "@/lib/engine/stt";
import { splitAtSilence } from "@/lib/speech/vad";
import { clock, toSrt, toVtt, type Cue } from "@/lib/subtitles";

export default function TranscribePage() {
  const [model, setModel] = useState(FILE_MODEL);
  const [task, setTask] = useState<"transcribe" | "translate">("transcribe");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [cues, setCues] = useState<Cue[] | null>(null);
  const [error, setError] = useState("");
  const [recording, setRecording] = useState<MediaRecorder | null>(null);
  const cancelled = useRef(false);
  const m = sttModel(model);

  // Start the download the moment a model is picked, not when Transcribe is pressed.
  useEffect(() => { loadStt(model); }, [model]);

  const run = async (f: Blob) => {
    setBusy(true); setError(""); setCues([]); setProgress(0); setStatus("Decoding audio…");
    cancelled.current = false;
    try {
      const audio = await decodeToMono(f, 16000);
      const pieces = splitAtSilence(audio);
      for (let i = 0; i < pieces.length && !cancelled.current; i++) {
        setStatus(`Transcribing · ${clock(pieces[i].start)} of ${clock(audio.length / 16000)}`);
        const r = await transcribe(pieces[i].audio, { model, task, timestamps: m.timestamps });
        const off = pieces[i].start;
        // Results stream into the page piece by piece instead of all at the end.
        const add: Cue[] = r.chunks.length
          ? r.chunks.map((c) => ({ text: c.text, start: off + c.timestamp[0], end: c.timestamp[1] == null ? null : off + c.timestamp[1] }))
          : r.text ? [{ text: r.text, start: off, end: off + pieces[i].audio.length / 16000 }] : [];
        setCues((x) => [...(x ?? []), ...add]);
        setProgress((i + 1) / pieces.length);
      }
    } catch (e) {
      setError(`Couldn't transcribe that file: ${(e as Error).message}`);
    } finally {
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

  const text = cues?.map((c) => c.text.trim()).join(" ") ?? "";

  return (
    <>
      <PageHero kicker="Speech to text" title="Transcribe files," accent="privately.">
        Get transcripts and SRT/VTT subtitles in 99 languages, or translate into English. The model runs in your browser, so nothing is uploaded.
        For live speech, use <a href="/dictate/" className="text-accent hover:underline">Dictate</a> or <a href="/notes/" className="text-accent hover:underline">Notes</a>.
      </PageHero>

      <section className="mx-auto grid max-w-6xl gap-6 px-5 py-10 md:px-8 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-5">
          <label onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
            className="relative flex min-h-52 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-md border border-dashed border-line-strong bg-surface p-8 text-center transition-colors hover:border-accent/50">
            <div className="dots pointer-events-none absolute inset-0" />
            <svg viewBox="0 0 24 24" className="relative size-7 text-accent" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></svg>
            <span className="relative font-medium">{file ? file.name : "Drop an audio or video file"}</span>
            <span className="relative text-xs text-muted">{file ? `${(file.size / 1e6).toFixed(1)} MB · click to change` : "MP3, WAV, M4A, OGG, WebM, MP4 · any length"}</span>
            <input type="file" accept="audio/*,video/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>

          <fieldset className="space-y-2">
            <legend className="label mb-2 text-sm text-accent">Model</legend>
            {STT_MODELS.map((x) => (
              <label key={x.id} className={`flex cursor-pointer items-center gap-3 rounded-sm border p-3 text-sm transition-colors ${model === x.id ? "border-accent/50 bg-accent-soft" : "border-line hover:border-line-strong"}`}>
                <input type="radio" name="model" checked={model === x.id} onChange={() => setModel(x.id)} className="accent-[var(--color-accent)]" />
                <span>{x.name}</span><span className="ml-auto text-xs text-muted">{x.note}{!x.timestamps && " · no subtitles"}</span>
              </label>
            ))}
          </fieldset>
          <SttStatus />

          {m.multilingual && (
            <div className="flex rounded-sm border border-line p-0.5 text-sm" role="group">
              {(["transcribe", "translate"] as const).map((t) => (
                <button key={t} onClick={() => setTask(t)} aria-pressed={task === t} className={`flex-1 rounded-sm py-1.5 transition-colors ${task === t ? "bg-elevated text-fg" : "text-muted"}`}>
                  {t === "transcribe" ? "Original language" : "Translate to English"}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button className={btn("primary", "md")} disabled={!file || busy} onClick={() => file && run(file)}>Transcribe</button>
            {busy && <button className={btn("ghost", "md")} onClick={() => { cancelled.current = true; }}>Cancel</button>}
            <button className={btn(recording ? "danger" : "secondary", "md")} disabled={busy && !recording} onClick={toggleRecord}>
              {recording ? "Stop recording" : "Record from microphone"}
            </button>
          </div>
          {status && (
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-sm text-muted"><Spinner /> {status}</p>
              <div className="h-0.5 overflow-hidden bg-line"><div className="h-full bg-accent transition-all" style={{ width: `${progress * 100}%` }} /></div>
            </div>
          )}
          {error && <p className="rounded-sm border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{error}</p>}
        </div>

        <div className={`${card} min-h-96 p-5`}>
          {!cues?.length && <div className="grid h-full place-items-center text-center text-sm text-subtle">{busy ? "The first lines will appear here in a few seconds." : "Your transcript will appear here."}</div>}
          {!!cues?.length && (
            <>
              <div className="flex flex-wrap gap-2">
                <button className={btn("primary", "sm")} onClick={() => navigator.clipboard.writeText(text)}>Copy</button>
                <button className={btn("ghost", "sm")} onClick={() => download(new Blob([text]), "transcript.txt")}>.txt</button>
                <button className={btn("ghost", "sm")} onClick={() => download(new Blob([toSrt(cues)]), "subtitles.srt")}>.srt</button>
                <button className={btn("ghost", "sm")} onClick={() => download(new Blob([toVtt(cues)]), "subtitles.vtt")}>.vtt</button>
              </div>
              <ol className="mt-5 max-h-[32rem] space-y-3 overflow-y-auto">
                {cues.map((c, i) => (
                  <li key={i} className="grid grid-cols-[3.5rem_1fr] gap-3 text-sm">
                    <span className="font-mono text-xs text-subtle">{clock(c.start)}</span>
                    <span className="leading-relaxed">{c.text.trim()}</span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      </section>
    </>
  );
}

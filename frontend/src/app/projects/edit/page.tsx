"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, reportUsage, useAuth, type Block, type Project } from "@/lib/api";
import { synthesize } from "@/lib/tts";
import { applyLexicon, concatAudio, download, encodeWav, slug } from "@/lib/audio";
import { voiceById } from "@/lib/voices";
import { EngineStatus } from "@/components/EngineStatus";
import { VoicePicker } from "@/components/VoicePicker";
import { Player } from "@/components/Player";
import { btn, card, input, Spinner } from "@/components/ui";

type Rendered = { key: string; audio: Float32Array; rate: number };
const renderKey = (b: Block, lex: string) => `${b.voice}|${b.speed}|${lex}|${b.text}`;
const newBlock = (voice = "af_heart"): Block => ({ _id: crypto.randomUUID(), text: "", voice, speed: 1, pauseAfter: 0.5 });

/** "NAME: line" scripts → one block per line with a voice per speaker; plain text → one block per paragraph. */
function parseScript(raw: string): Block[] {
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const speaker = /^([A-Za-z][\w .'-]{0,24}):\s+(.+)$/;
  if (lines.length > 1 && lines.filter((l) => speaker.test(l)).length / lines.length > 0.6) {
    const cast = new Map<string, string>();
    const pool = ["af_heart", "am_michael", "bf_emma", "am_fenrir", "af_bella", "bm_george", "af_nicole", "am_puck"];
    return lines.map((l) => {
      const m = l.match(speaker);
      const name = m ? m[1].toUpperCase() : "NARRATOR";
      if (!cast.has(name)) cast.set(name, pool[cast.size % pool.length]);
      return { ...newBlock(cast.get(name)), text: m ? m[2] : l, pauseAfter: 0.35 };
    });
  }
  return raw.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((text) => ({ ...newBlock(), text }));
}

const chip = "rounded-md border border-line px-2.5 py-1 text-xs text-muted transition-colors hover:border-line-strong hover:text-fg disabled:opacity-40";

function Editor() {
  const id = useSearchParams().get("id") || "";
  const { user, ready, lexicon } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState("");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "dirty" | "error">("saved");
  const [rendering, setRendering] = useState<number | null>(null);
  const [mastering, setMastering] = useState(false);
  const [mix, setMix] = useState<{ blob: Blob; samples: Float32Array } | null>(null);
  const [solo, setSolo] = useState<{ i: number; blob: Blob; samples: Float32Array } | null>(null);
  const [importText, setImportText] = useState("");
  const cache = useRef(new Map<string, Rendered>());
  const abort = useRef<AbortController | null>(null);
  const lexKey = JSON.stringify(lexicon);

  useEffect(() => {
    if (!user || !id) return;
    api<{ project: Project }>(`/api/projects/${id}`).then((r) => setProject(r.project)).catch((e) => setError(e.message));
  }, [user, id]);

  // Debounced autosave
  useEffect(() => {
    if (!project || saveState !== "dirty") return;
    const t = setTimeout(async () => {
      setSaveState("saving");
      try {
        await api(`/api/projects/${id}`, { method: "PUT", json: {
          title: project.title, kind: project.kind,
          blocks: project.blocks.map(({ text, voice, speed, pauseAfter }) => ({ text, voice, speed, pauseAfter })),
        } });
        setSaveState((s) => (s === "saving" ? "saved" : s));
      } catch (e) { setSaveState("error"); setError((e as Error).message); }
    }, 1200);
    return () => clearTimeout(t);
  }, [project, saveState, id]);

  const edit = (fn: (p: Project) => Project) => { setProject((p) => (p ? fn(p) : p)); setSaveState("dirty"); };
  const editBlock = (i: number, patch: Partial<Block>) => edit((p) => ({ ...p, blocks: p.blocks.map((b, j) => (j === i ? { ...b, ...patch } : b)) }));
  const move = (i: number, d: -1 | 1) => edit((p) => {
    const blocks = [...p.blocks];
    const j = i + d;
    if (j < 0 || j >= blocks.length) return p;
    [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
    return { ...p, blocks };
  });

  const renderBlock = async (b: Block, signal?: AbortSignal) => {
    const key = renderKey(b, lexKey);
    const hit = cache.current.get(key);
    if (hit) return hit;
    const chunks = await synthesize(applyLexicon(b.text, lexicon), { voice: b.voice, speed: b.speed, signal });
    const rate = chunks[0]?.sampleRate ?? 24000;
    const r = { key, audio: concatAudio(chunks, rate), rate };
    if (!signal?.aborted) {
      cache.current.set(key, r);
      reportUsage(b.text.length, r.audio.length / rate);
    }
    return r;
  };

  const renderAll = async () => {
    if (!project) return;
    abort.current = new AbortController();
    setMix(null); setError(""); setMastering(true);
    try {
      const parts: { audio: Float32Array; pauseAfter: number }[] = [];
      let rate = 24000;
      for (const [i, b] of project.blocks.entries()) {
        if (!b.text.trim()) continue;
        setRendering(i);
        const r = await renderBlock(b, abort.current.signal);
        if (abort.current.signal.aborted) return;
        rate = r.rate;
        parts.push({ audio: r.audio, pauseAfter: b.pauseAfter });
      }
      const samples = concatAudio(parts, rate);
      setMix({ samples, blob: encodeWav(samples, rate) });
    } catch (e) { setError((e as Error).message); } finally { setRendering(null); setMastering(false); abort.current = null; }
  };

  const previewBlock = async (i: number) => {
    setRendering(i);
    try {
      const r = await renderBlock(project!.blocks[i]);
      setSolo({ i, samples: r.audio, blob: encodeWav(r.audio, r.rate) });
    } catch (e) { setError((e as Error).message); } finally { setRendering(null); }
  };

  if (ready && !user) return <div className="p-20 text-center"><Link className={btn("primary")} href="/auth/?next=/projects/">Sign in to open projects</Link></div>;
  if (error && !project) return <div className="p-20 text-center text-sm text-danger">{error} · <Link href="/projects/" className="underline">Back to projects</Link></div>;
  if (!project) return <div className="p-20 text-center text-sm text-muted">Loading project…</div>;

  const chars = project.blocks.reduce((n, b) => n + b.text.length, 0);
  const cast = [...new Set(project.blocks.map((b) => b.voice))];

  return (
    <section className="mx-auto max-w-6xl px-5 py-10 md:px-8">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link href="/projects/" className="text-muted hover:text-fg">← Projects</Link>
        <span className={`ml-auto text-xs ${saveState === "saved" ? "text-subtle" : saveState === "error" ? "text-danger" : "text-accent"}`}>
          {saveState === "saved" ? "All changes saved" : saveState === "error" ? "Save failed" : "Saving…"}
        </span>
      </div>

      <input value={project.title} onChange={(e) => edit((p) => ({ ...p, title: e.target.value.slice(0, 140) }))} aria-label="Project title"
        className="mt-4 w-full bg-transparent text-3xl font-semibold tracking-tight focus:outline-none" />
      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted">
        <select value={project.kind} onChange={(e) => edit((p) => ({ ...p, kind: e.target.value as Project["kind"] }))}
          className="rounded-md border border-line bg-surface px-2 py-1 text-xs" aria-label="Project type">
          {["audiobook", "podcast", "voiceover", "other"].map((k) => <option key={k}>{k}</option>)}
        </select>
        <span>{project.blocks.length} blocks</span><span>·</span><span>{chars.toLocaleString()} characters</span><span>·</span>
        <span className="flex items-center gap-1">
          {cast.map((c) => <span key={c} className="size-3 rounded-full" title={voiceById(c).name} style={{ background: voiceById(c).color }} />)}
        </span>
      </div>

      <div className="mt-6"><EngineStatus /></div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <ol className="min-w-0 space-y-3">
          {project.blocks.map((b, i) => {
            const v = voiceById(b.voice);
            return (
              <li key={b._id ?? i} className={`${card} p-4 transition-colors ${rendering === i ? "border-accent/60" : ""}`}>
                <div className="flex flex-wrap items-center gap-4">
                  <span className="w-5 text-xs tabular-nums text-subtle">{i + 1}</span>
                  <div className="min-w-56 flex-1"><VoicePicker value={b.voice} onChange={(voice) => editBlock(i, { voice })} /></div>
                  <label className="text-xs text-muted">Speed {b.speed.toFixed(2)}×
                    <input type="range" min={0.5} max={2} step={0.05} value={b.speed} onChange={(e) => editBlock(i, { speed: +e.target.value })} className="block w-24" />
                  </label>
                  <label className="text-xs text-muted">Pause {b.pauseAfter.toFixed(1)}s
                    <input type="range" min={0} max={5} step={0.1} value={b.pauseAfter} onChange={(e) => editBlock(i, { pauseAfter: +e.target.value })} className="block w-24" />
                  </label>
                </div>
                <textarea value={b.text} onChange={(e) => editBlock(i, { text: e.target.value.slice(0, 20000) })} placeholder="What should this voice say?"
                  className={`${input} mt-3 min-h-24 resize-y text-[15px] leading-relaxed`} aria-label={`Block ${i + 1} text`} />
                {solo?.i === i && <div className="mt-3"><Player blob={solo.blob} samples={solo.samples} color={v.color} autoPlay /></div>}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <button className={chip} disabled={rendering !== null || !b.text.trim()} onClick={() => previewBlock(i)}>{rendering === i && !mastering ? "Generating…" : "Preview"}</button>
                  <button className={chip} onClick={() => move(i, -1)} aria-label="Move up">↑</button>
                  <button className={chip} onClick={() => move(i, 1)} aria-label="Move down">↓</button>
                  <button className={chip} onClick={() => edit((p) => ({ ...p, blocks: [...p.blocks.slice(0, i + 1), newBlock(b.voice), ...p.blocks.slice(i + 1)] }))}>Insert below</button>
                  <button className={`${chip} ml-auto hover:text-danger`} onClick={() => edit((p) => ({ ...p, blocks: p.blocks.filter((_, j) => j !== i) }))}>Delete</button>
                </div>
              </li>
            );
          })}
          <button className={btn("secondary")} onClick={() => edit((p) => ({ ...p, blocks: [...p.blocks, newBlock(p.blocks.at(-1)?.voice)] }))}>Add block</button>
        </ol>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className={`${card} space-y-4 p-4`}>
            <div>
              <h2 className="font-medium">Export</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted">Generates every block in order with its pauses. Unchanged blocks are reused, so re-exports are quick.</p>
            </div>
            {mastering
              ? <button className={`${btn("secondary")} w-full`} onClick={() => abort.current?.abort()}><Spinner /> Stop · block {(rendering ?? 0) + 1} of {project.blocks.length}</button>
              : <button className={`${btn("primary")} w-full`} onClick={renderAll} disabled={rendering !== null || !chars}>Render full audio</button>}
            {mix && (
              <div className="space-y-3">
                <Player blob={mix.blob} samples={mix.samples} />
                <button className={`${btn("secondary", "sm")} w-full`} onClick={() => download(mix.blob, `${slug(project.title)}.wav`)}>Download WAV</button>
              </div>
            )}
            {error && <p className="text-xs text-danger">{error}</p>}
          </div>

          <div className={`${card} space-y-3 p-4`}>
            <h2 className="font-medium">Import script</h2>
            <p className="text-xs leading-relaxed text-muted">Paste prose (split on blank lines) or dialogue like <code className="text-fg">ALEX: Hello!</code>. Each speaker gets their own voice.</p>
            <textarea className={`${input} min-h-28`} value={importText} onChange={(e) => setImportText(e.target.value)} placeholder={"NARRATOR: The rain had not stopped for days.\nMIRA: Did you hear that?"} />
            <div className="flex flex-wrap gap-2">
              <button className={btn("secondary", "sm")} disabled={!importText.trim()} onClick={() => { edit((p) => ({ ...p, blocks: [...p.blocks, ...parseScript(importText)] })); setImportText(""); }}>Append</button>
              <button className={btn("ghost", "sm")} disabled={!importText.trim()} onClick={() => { if (confirm("Replace all blocks?")) { edit((p) => ({ ...p, blocks: parseScript(importText) })); setImportText(""); } }}>Replace all</button>
              <label className={`${btn("ghost", "sm")} cursor-pointer`}>
                Upload .txt
                <input type="file" accept=".txt,.md,text/plain" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setImportText(await f.text()); }} />
              </label>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

export default function EditPage() {
  return <Suspense><Editor /></Suspense>;
}

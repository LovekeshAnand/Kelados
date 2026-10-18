"use client";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { MicButton } from "@/components/MicButton";
import { ModelStorage } from "@/components/ModelStorage";
import { SnippetEditor } from "@/components/SnippetEditor";
import { SttStatus } from "@/components/SttStatus";
import { btn, card, LevelDots, PageHero } from "@/components/ui";
import { STT_MODELS, sttModel } from "@/lib/engine/stt";
import { speak } from "@/lib/engine/tts";
import { dictationsDb, type Dictation } from "@/lib/local-db";
import { joinText } from "@/lib/speech/cleanup";
import { LANGUAGES, useDictateSettings } from "@/lib/speech/settings";
import { useSnippets } from "@/lib/speech/snippets";
import { voiceEdit } from "@/lib/speech/edit";
import { useDictation } from "@/lib/speech/useDictation";
import { useLearned } from "@/lib/speech/useLearned";

const COMMANDS = [
  ["new line / new paragraph", "line breaks"],
  ["bullet point", "starts a list item"],
  ["comma · colon · question mark", "punctuation"],
  ["scratch that", "deletes the last phrase"],
  ["Wednesday 6pm, no no, Friday 8pm", "keeps only the correction"],
  ["नई लाइन · पूर्ण विराम · नहीं नहीं", "the same, in Hindi"],
];

export default function DictatePage() {
  const { settings, update, setLanguage, language } = useDictateSettings();
  const learned = useLearned(settings.learn);
  const [text, setText] = useState("");
  const [history, setHistory] = useState<Dictation[]>([]);
  const [reading, setReading] = useState<{ stop: () => void } | null>(null);
  const pieces = useRef<string[]>([]); // what each phrase added, so "scratch that" can remove it
  const { items: snippets } = useSnippets();
  const inDesktopApp = useSyncExternalStore(() => () => {}, () => /Electron\//.test(navigator.userAgent), () => false);

  useEffect(() => {
    dictationsDb.list().then(setHistory).catch(() => {});
  }, []);

  const textRef = useRef(text);
  const commandsRef = useRef(settings.commands);
  useLayoutEffect(() => { textRef.current = text; commandsRef.current = settings.commands; });
  const onText = useCallback((phrase: string, undo: boolean) => {
    const t = textRef.current;
    let next = t;
    if (undo) {
      const last = pieces.current.pop();
      if (last && t.endsWith(last)) next = t.slice(0, -last.length).trimEnd();
    } else {
      // Voice edits rewrite what this session typed ("change coffee to tea"); manual typing clears that memory.
      const ed = commandsRef.current ? voiceEdit(pieces.current, phrase) : null;
      const old = ed ? pieces.current.slice(ed.from).join("") : "";
      if (ed && t.endsWith(old)) {
        next = t.slice(0, t.length - old.length) + ed.text;
        pieces.current.splice(ed.from, pieces.current.length, ed.text);
      } else {
        next = joinText(t, phrase);
        pieces.current.push(next.slice(t.length));
      }
    }
    textRef.current = next;
    setText(next);
  }, []);

  const d = useDictation({
    model: settings.model, language,
    sensitivity: settings.sensitivity, fillers: settings.fillers, commands: settings.commands, snippets, onText, transform: learned,
    preload: inDesktopApp ? "never" : "cached", // the desktop app's overlay already holds the model in memory
  });

  // Hold Space anywhere outside a text field to talk, like a walkie-talkie.
  useEffect(() => {
    const typing = (e: KeyboardEvent) => e.target instanceof HTMLElement && e.target.closest("input, textarea, select, [contenteditable]");
    const down = (e: KeyboardEvent) => { if (e.code === "Space" && !e.repeat && !typing(e)) { e.preventDefault(); d.start(); } };
    const up = (e: KeyboardEvent) => { if (e.code === "Space" && !typing(e)) { e.preventDefault(); d.stop(); } };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [d.start, d.stop]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    if (!text.trim()) return;
    const item = { id: crypto.randomUUID(), text, createdAt: Date.now() };
    await dictationsDb.put(item);
    setHistory((h) => [item, ...h]);
  };
  const readAloud = () => {
    if (reading) { reading.stop(); setReading(null); return; }
    const r = speak(text);
    setReading(r);
    r.done.catch(() => {}).finally(() => setReading(null));
  };

  return (
    <>
      <PageHero kicker="Dictation" title="Speak." accent="It writes.">
        Talk naturally and get clean, punctuated text. Fillers vanish, &ldquo;scratch that&rdquo; works, and your snippets expand.
        Everything runs on your device. Want it in every app? <Link href="/download/" className="text-accent underline-offset-4 hover:underline">Get the desktop app</Link>.
      </PageHero>

      <section className="mx-auto grid max-w-6xl gap-6 px-5 py-10 md:px-8 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          <div className={`${card} relative overflow-hidden`}>
            <div className="flex flex-col items-start gap-5 border-b border-line p-5 sm:flex-row sm:items-center">
              <MicButton status={d.status} level={d.level} onClick={d.toggle} />
              <div className="min-w-0 flex-1 space-y-2">
                <p className="display text-3xl">
                  {d.status === "listening" ? "Listening" : d.status === "starting" ? "Starting mic" : d.status === "finishing" ? "Finishing" : <><span className="sm:hidden">Tap to talk</span><span className="hidden sm:inline">Tap or hold space</span></>}
                </p>
                <LevelDots level={d.level} active={d.status === "listening"} />
                <SttStatus />
              </div>
            </div>
            <textarea value={text} onChange={(e) => { setText(e.target.value); pieces.current = []; }} rows={12}
              placeholder="Your words appear here. Edit freely; new dictation is added at the end."
              className="block w-full resize-y bg-transparent p-5 text-[17px] leading-relaxed placeholder:text-subtle focus:outline-none" />
            {d.partial && <p className="border-t border-line px-5 py-3 text-[15px] italic text-muted">{d.partial}…</p>}
            {d.error && <p className="border-t border-danger/30 bg-danger/10 px-5 py-3 text-sm text-danger">{d.error}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={btn("primary", "md")} disabled={!text} onClick={() => navigator.clipboard.writeText(text)}>Copy</button>
            <button className={btn("secondary", "md")} disabled={!text} onClick={readAloud}>{reading ? "Stop reading" : "Read aloud"}</button>
            <button className={btn("secondary", "md")} disabled={!text} onClick={save}>Save</button>
            <button className={btn("ghost", "md")} disabled={!text} onClick={() => { setText(""); pieces.current = []; }}>Clear</button>
          </div>

          {history.length > 0 && (
            <div className="pt-6">
              <h2 className="label text-sm text-accent">Saved dictations</h2>
              <ul className="mt-3 divide-y divide-line border-y border-line">
                {history.map((h) => (
                  <li key={h.id} className="flex items-start gap-3 py-3">
                    <p className="line-clamp-2 flex-1 text-sm text-muted">{h.text}</p>
                    <span className="shrink-0 font-mono text-[11px] text-subtle">{new Date(h.createdAt).toLocaleDateString()}</span>
                    <button className={btn("ghost", "sm")} onClick={() => navigator.clipboard.writeText(h.text)}>Copy</button>
                    <button className={btn("ghost", "sm")} onClick={() => { dictationsDb.remove(h.id); setHistory((x) => x.filter((y) => y.id !== h.id)); }}>Delete</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className={`${card} space-y-4 p-5`}>
            <h2 className="label text-sm text-accent">Engine</h2>
            <select value={settings.model} onChange={(e) => update({ model: e.target.value })}
              className="w-full rounded-sm border border-line bg-bg px-3 py-2 text-sm">
              {STT_MODELS.map((m) => <option key={m.id} value={m.id}>{m.name} · {m.note}</option>)}
            </select>
            <label className="block text-xs text-muted">Language
              <select value={sttModel(settings.model).multilingual ? settings.language : "en"} onChange={(e) => setLanguage(e.target.value)}
                className="mt-1 w-full rounded-sm border border-line bg-bg px-3 py-2 text-sm text-fg">
                {LANGUAGES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
              </select>
            </label>
            <label className="block text-xs text-muted">Mic sensitivity · {settings.sensitivity.toFixed(1)}×
              <input type="range" min={0.5} max={2.5} step={0.1} value={settings.sensitivity} onChange={(e) => update({ sensitivity: +e.target.value })} className="mt-2 w-full" />
            </label>
            {([["fillers", "Remove um, uh and stutters"], ["commands", "Voice commands and corrections"], ["learn", "Learn my names and terms, fix mishearings"]] as const).map(([k, label]) => (
              <label key={k} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={settings[k]} onChange={(e) => update({ [k]: e.target.checked })} className="accent-[var(--color-accent)]" />
                {label}
              </label>
            ))}
          </div>

          <div className={`${card} p-5`}>
            <h2 className="label text-sm text-accent">Voice commands</h2>
            <dl className="mt-3 space-y-2 text-sm">
              {COMMANDS.map(([say, does]) => (
                <div key={say} className="flex justify-between gap-3"><dt className="font-mono text-xs text-fg">{say}</dt><dd className="text-right text-xs text-muted">{does}</dd></div>
              ))}
            </dl>
          </div>

          <div className={`${card} p-5`}>
            <h2 className="label mb-3 text-sm text-accent">Snippets & dictionary</h2>
            <SnippetEditor />
          </div>

          <div className={`${card} p-5`}>
            <h2 className="label mb-3 text-sm text-accent">Storage</h2>
            <ModelStorage />
          </div>
        </aside>
      </section>
    </>
  );
}

"use client";
// Runs inside the Kelados desktop app (Electron) as an always-on-top, non-focusable overlay.
// The app's preload script exposes `window.kelados`; the page never touches the OS directly.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { DictationPill } from "@/components/DictationPill";
import { micStream } from "@/lib/engine/live";
import { startRewind, transcribeBuffer, type Rewind } from "@/lib/engine/rewind";
import { useStt } from "@/lib/engine/stt";
import { speak, unloadEngine, useEngine } from "@/lib/engine/tts";
import { addDictation } from "@/lib/local-db";
import { cleanup, joinText, keyCommand, type KeyName } from "@/lib/speech/cleanup";
import { useDictateSettings } from "@/lib/speech/settings";
import { useSnippets } from "@/lib/speech/snippets";
import { voiceEdit } from "@/lib/speech/edit";
import { useDictation } from "@/lib/speech/useDictation";
import { useLearned } from "@/lib/speech/useLearned";

// The optional members arrived in desktop 1.2; older apps simply don't offer Rewind, read-aloud or spoken keys.
type Bridge = {
  onToggle(cb: () => void): void; insert(text: string): void; undo(): void; status(s: string): void;
  onRewind?(cb: () => void): void; setRewind?(on: boolean): void; onRead?(cb: (text: string) => void): void; key?(name: KeyName): void;
  replace?(count: number, text: string): void;
};
const bridge = () => (window as unknown as { kelados?: Bridge }).kelados;
const KEY_LABELS: Record<KeyName, string> = { enter: "Enter", tab: "Tab", backspace: "Delete word", selectAll: "Select all", copy: "Copy", paste: "Paste" };

export default function DesktopOverlay() {
  const { settings, language } = useDictateSettings();
  const { items: snippets } = useSnippets();
  const learned = useLearned(settings.learn);
  const [last, setLast] = useState("");
  const [busy, setBusy] = useState<"" | "rewinding" | "reading" | "notice">("");
  const session = useRef({ pieces: [] as string[], seconds: 0 }); // saved to history when the session ends
  const lastTyped = useRef(0); // when Kelados last typed: resuming within a minute is almost always the same text field
  const lastToggle = useRef(0);
  const ring = useRef<Rewind | null>(null);
  const reader = useRef<{ stop: () => void } | null>(null);

  const type = (text: string, seconds: number) => {
    const s = session.current;
    // A new session starts without a leading space, unless it picks up within a minute of the last one.
    const piece = s.pieces.length || Date.now() - lastTyped.current < 60_000 ? joinText("x", text).slice(1) : text;
    lastTyped.current = Date.now();
    bridge()?.insert(piece);
    s.pieces.push(piece);
    s.seconds += seconds;
    setLast(text);
  };
  const save = () => {
    const { pieces, seconds } = session.current;
    session.current = { pieces: [], seconds: 0 };
    const text = pieces.join("").trim();
    if (text) addDictation({ id: crypto.randomUUID(), text, createdAt: Date.now(), seconds, source: "desktop" }).catch(() => {});
  };
  const notice = (text: string) => {
    setLast(text); setBusy("notice");
    setTimeout(() => setBusy((b) => (b === "notice" ? "" : b)), 2500);
  };

  const d = useDictation({
    model: settings.model, language, sensitivity: settings.sensitivity, preload: "always",
    fillers: settings.fillers, commands: settings.commands, snippets, transform: learned,
    prime: () => ring.current?.take(1.5), // with Rewind on, words said just before the shortcut still count
    onText: (text, undo, seconds) => {
      if (undo) { session.current.pieces.pop(); return bridge()?.undo(); }
      // "No no, make it Saturday", "change coffee to tea", "make that a bullet list": rewrite what's already typed.
      // Backspaces over Kelados' own text, so it relies on the cursor still being where Kelados left it.
      // ponytail: counts code points; an emoji sequence or a Devanagari cluster some apps delete in one keystroke over-deletes.
      const s = session.current;
      const ed = settings.commands && bridge()?.replace ? voiceEdit(s.pieces, text) : null;
      if (ed) {
        bridge()!.replace!([...s.pieces.slice(ed.from).join("")].length, ed.text);
        s.pieces.splice(ed.from, s.pieces.length, ed.text);
        setLast(`${ed.label}: ${ed.text.trim()}`);
        return;
      }
      // "Press enter", "send it", "select all": a key in the app you're using, not words.
      const key = settings.commands && bridge()?.key ? keyCommand(text) : null;
      if (key) { bridge()!.key!(key); setLast(`Pressed ${KEY_LABELS[key]}`); return; }
      type(text, seconds);
    },
  });

  // Session ended: keep it in history (feeds Home, stats and learning) and forget the Rewind audio it covered.
  useEffect(() => {
    if (d.status === "idle") { save(); ring.current?.clear(); }
  }, [d.status]);

  const actions = useRef<{ toggle: () => void; rewind: () => Promise<void>; read: (text: string) => void }>({ toggle: () => {}, rewind: async () => {}, read: () => {} });
  useLayoutEffect(() => {
    actions.current = {
      toggle: () => {
        // A double-tap or a held key fires the shortcut again within a moment; only the first press counts.
        if (Date.now() - lastToggle.current < 400) return;
        lastToggle.current = Date.now();
        if (d.status === "idle") setLast("");
        d.toggle();
      },
      rewind: async () => {
        const r = ring.current;
        if (!r || busy || d.status !== "idle") return;
        const audio = r.take();
        r.clear();
        setBusy("rewinding"); setLast("");
        try {
          const { texts, seconds } = await transcribeBuffer(audio, { model: settings.model, language, sensitivity: settings.sensitivity });
          for (const t of texts) {
            const c = cleanup(t, { fillers: settings.fillers, commands: settings.commands, snippets });
            if (c.text) type(learned ? learned(c.text) : c.text, seconds / texts.length);
          }
          if (!texts.length) setLast("Nothing was said in the last 30 seconds.");
        } finally {
          save();
          setBusy("");
        }
      },
      // Read the selection aloud; pressing the shortcut again stops it.
      read: (text) => {
        if (reader.current) { reader.current.stop(); reader.current = null; setBusy(""); return; }
        const t = text.trim();
        if (!t) return notice("Select some text first, then press Ctrl+Alt+S.");
        // The voices are English: Hindi or other scripts come out as near-silence, so say so instead.
        if (!/[a-z]/i.test(t)) return notice("Read-aloud speaks English for now. Select English text.");
        const r = speak(t);
        reader.current = r;
        setBusy("reading"); setLast(t);
        r.done.catch(() => {}).finally(() => { if (reader.current === r) { reader.current = null; setBusy(""); } });
      },
    };
  });

  useEffect(() => {
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    bridge()?.onToggle(() => actions.current.toggle());
    bridge()?.onRewind?.(() => void actions.current.rewind());
    bridge()?.onRead?.((text) => actions.current.read(text));
  }, []);

  // The voice model needs over 1 GB once loaded, so it loads on the first read-aloud and is released after 10 minutes
  // without one. The dictation overlay itself stays light.
  const voice = useEngine();
  useEffect(() => {
    if (busy === "reading" || voice.status !== "ready") return;
    const t = setTimeout(unloadEngine, 10 * 60_000);
    return () => clearTimeout(t);
  }, [busy, voice.status]);

  // Rewind keeps the mic open into a 30-second in-memory buffer; turning it off releases the mic.
  useEffect(() => {
    if (!settings.rewind || !bridge()?.setRewind) return;
    let stream: MediaStream | null = null, live = true;
    micStream().then(async (s) => {
      stream = s;
      const r = await startRewind(s);
      if (live) { ring.current = r; bridge()!.setRewind!(true); } else r.stop();
    }).catch(() => {});
    return () => {
      live = false;
      bridge()?.setRewind?.(false);
      ring.current?.stop();
      ring.current = null;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [settings.rewind]);

  // A first-time download is the one moment worth showing the pill unasked, so the user sees progress.
  const stt = useStt();
  const downloading = d.status === "idle" && stt.status === "loading" && stt.cached === false;
  useEffect(() => { bridge()?.status(busy || (downloading ? "loading" : d.status)); }, [d.status, downloading, busy]);

  const label = { rewinding: "Typing the last 30 seconds", reading: voice.status === "ready" ? "Reading aloud · Ctrl+Alt+S to stop" : "Preparing the voice…", notice: "Kelados", "": undefined }[busy];
  return (
    <div className="app-ui p-2" style={{ background: "transparent" }}>
      <DictationPill status={busy === "rewinding" ? "finishing" : d.status} level={d.level} partial={d.partial} last={last} error={d.error} label={label}
        hint={downloading ? "Downloading the speech model once. It stays on this computer." : "Talk, then pause. Your words are typed where the cursor is."} />
    </div>
  );
}

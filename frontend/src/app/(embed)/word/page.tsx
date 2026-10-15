"use client";
// Microsoft Word task pane (see integrations/word-addin/manifest.xml). Dictates at the cursor and reads text aloud.
import Script from "next/script";
import { useRef, useState } from "react";
import { DictationPill } from "@/components/DictationPill";
import { MicButton } from "@/components/MicButton";
import { btn } from "@/components/ui";
import { Wordmark } from "@/components/Wordmark";
import { speak } from "@/lib/engine/tts";
import { joinText } from "@/lib/speech/cleanup";
import { useDictateSettings } from "@/lib/speech/settings";
import { useSnippets } from "@/lib/speech/snippets";
import { useDictation } from "@/lib/speech/useDictation";

/* eslint-disable @typescript-eslint/no-explicit-any */
const office = () => (globalThis as any).Office;
const word = () => (globalThis as any).Word;

// Office.js queues Word.run calls itself; we just keep inserts in speaking order.
let chain = Promise.resolve();
const run = <T,>(fn: (ctx: any) => Promise<T>) => (chain = chain.then(() => word().run(fn))) as Promise<T>;

export default function WordPane() {
  const [ready, setReady] = useState(false);
  const [last, setLast] = useState("");
  const [error, setError] = useState("");
  const [reading, setReading] = useState<{ stop: () => void } | null>(null);
  const typed = useRef(false);
  const { settings, language } = useDictateSettings();
  const { items: snippets } = useSnippets();

  const insert = (text: string) => run(async (ctx) => {
    const range = ctx.document.getSelection().insertText(text, "Replace");
    range.select("End");
    await ctx.sync();
  }).catch((e) => setError(e.message));

  const d = useDictation({
    model: settings.model, language, sensitivity: settings.sensitivity,
    fillers: settings.fillers, commands: settings.commands, snippets,
    onText: (text, undo) => {
      if (undo) return;
      insert(typed.current ? joinText("x", text).slice(1) : text);
      typed.current = true;
      setLast(text);
    },
  });

  const toggle = async () => {
    if (d.status === "idle") {
      typed.current = false;
      // Desktop Word asks the user before a task pane may use the microphone.
      await office()?.devicePermission?.requestPermissionsAsync?.([office().DevicePermissionType.microphone]).catch(() => {});
    }
    d.toggle();
  };

  const read = async (scope: "selection" | "document") => {
    if (reading) { reading.stop(); setReading(null); return; }
    try {
      const text = await run(async (ctx) => {
        const target = scope === "selection" ? ctx.document.getSelection() : ctx.document.body;
        target.load("text");
        await ctx.sync();
        return target.text as string;
      });
      if (!text.trim()) return setError(scope === "selection" ? "Select some text first." : "The document is empty.");
      const r = speak(text);
      setReading(r);
      r.done.catch(() => {}).finally(() => setReading(null));
    } catch (e) { setError((e as Error).message); }
  };

  return (
    <div className="space-y-4 p-4">
      <Script src="https://appsforoffice.microsoft.com/lib/1/hosted/office.js" strategy="afterInteractive"
        onLoad={() => office()?.onReady(() => setReady(!!word()))} />
      <Wordmark className="h-5 text-accent" />
      {!ready && <p className="text-sm text-muted">Open this panel from Word: Home → Kelados.</p>}
      <div className="flex justify-center"><MicButton status={d.status} level={d.level} onClick={toggle} /></div>
      <DictationPill status={d.status} level={d.level} partial={d.partial} last={last} error={error || d.error}
        hint="Press the mic and talk. Text goes where your cursor is." />
      <div className="grid grid-cols-2 gap-2">
        <button className={btn("secondary", "sm")} disabled={!ready} onClick={() => read("selection")}>{reading ? "Stop" : "Read selection"}</button>
        <button className={btn("secondary", "sm")} disabled={!ready} onClick={() => read("document")}>{reading ? "Stop" : "Read document"}</button>
      </div>
      <p className="text-[11px] leading-relaxed text-subtle">Say &ldquo;new paragraph&rdquo;, &ldquo;bullet point&rdquo; or &ldquo;comma&rdquo;. Everything runs on this computer.</p>
    </div>
  );
}

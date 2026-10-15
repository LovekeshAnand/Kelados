"use client";
// Opened by the Kelados Chrome extension as a small popup window. Dictation runs here (one mic permission for
// this site); each phrase goes to the extension, which types it into the tab you were in (Google Docs, Gmail, …).
import { Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DictationPill } from "@/components/DictationPill";
import { MicButton } from "@/components/MicButton";
import { joinText } from "@/lib/speech/cleanup";
import { useDictateSettings } from "@/lib/speech/settings";
import { useSnippets } from "@/lib/speech/snippets";
import { useDictation } from "@/lib/speech/useDictation";

type Chrome = { runtime?: { sendMessage(id: string, msg: unknown, cb?: (r: { ok: boolean; error?: string }) => void): void; lastError?: { message: string } } };
const chromeApi = () => (globalThis as unknown as { chrome?: Chrome }).chrome;

function Popup() {
  const params = useSearchParams();
  const ext = params.get("ext") || "";
  const tab = Number(params.get("tab"));
  const { settings, language } = useDictateSettings();
  const { items: snippets } = useSnippets();
  const [last, setLast] = useState("");
  const [error, setError] = useState("");
  const typed = useRef(false);

  const send = (msg: object) => chromeApi()?.runtime?.sendMessage(ext, { tab, ...msg }, (r) => {
    const err = chromeApi()?.runtime?.lastError?.message || (r && !r.ok && r.error);
    setError(err ? `Couldn't type into the page: ${err}` : "");
  });

  const d = useDictation({
    model: settings.model, language, sensitivity: settings.sensitivity,
    fillers: settings.fillers, commands: settings.commands, snippets,
    onText: (text, undo) => {
      if (undo) return;
      send({ type: "insert", text: typed.current ? joinText("x", text).slice(1) : text });
      typed.current = true;
      setLast(text);
    },
  });

  const start = useRef(d.start);
  useLayoutEffect(() => { start.current = d.start; });
  useEffect(() => { if (ext) void start.current(); }, [ext]);

  if (!ext || !chromeApi()?.runtime) {
    return <p className="p-4 text-sm text-muted">Open this from the Kelados Chrome extension (Alt+Shift+D in any tab).</p>;
  }
  return (
    <div className="flex items-center gap-3 p-3">
      <MicButton status={d.status} level={d.level} onClick={d.toggle} size={84} />
      <div className="min-w-0 flex-1">
        <DictationPill status={d.status} level={d.level} partial={d.partial} last={last} error={error || d.error}
          hint="Speak; each phrase is typed into your tab. Close this window to finish." />
      </div>
    </div>
  );
}

export default function ExtensionPopup() {
  return <Suspense><Popup /></Suspense>;
}

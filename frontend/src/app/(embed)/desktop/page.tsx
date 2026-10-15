"use client";
// Runs inside the Kelados desktop app (Electron) as an always-on-top, non-focusable overlay.
// The app's preload script exposes `window.kelados`; the page never touches the OS directly.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { DictationPill } from "@/components/DictationPill";
import { joinText } from "@/lib/speech/cleanup";
import { useDictateSettings } from "@/lib/speech/settings";
import { useSnippets } from "@/lib/speech/snippets";
import { useDictation } from "@/lib/speech/useDictation";

type Bridge = { onToggle(cb: () => void): void; insert(text: string): void; undo(): void; status(s: string): void };
const bridge = () => (window as unknown as { kelados?: Bridge }).kelados;

export default function DesktopOverlay() {
  const { settings, language } = useDictateSettings();
  const { items: snippets } = useSnippets();
  const [last, setLast] = useState("");
  const typed = useRef(false); // has this session typed anything yet (decides the leading space)

  const d = useDictation({
    model: settings.model, language, sensitivity: settings.sensitivity,
    fillers: settings.fillers, commands: settings.commands, snippets,
    onText: (text, undo) => {
      if (undo) return bridge()?.undo();
      bridge()?.insert(typed.current ? joinText("x", text).slice(1) : text);
      typed.current = true;
      setLast(text);
    },
  });
  const toggle = useRef(() => {});
  useLayoutEffect(() => {
    toggle.current = () => {
      if (d.status === "idle") { typed.current = false; setLast(""); } // a fresh session starts without a leading space
      d.toggle();
    };
  });

  useEffect(() => {
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    bridge()?.onToggle(() => toggle.current());
  }, []);
  useEffect(() => { bridge()?.status(d.status); }, [d.status]);

  return (
    <div className="p-2">
      <DictationPill status={d.status} level={d.level} partial={d.partial} last={last} error={d.error}
        hint="Talk, then pause. Text is typed where your cursor is. Ctrl+Shift+Space to stop." />
    </div>
  );
}

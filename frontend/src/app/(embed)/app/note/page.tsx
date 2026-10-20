"use client";
// The sticky note. The desktop app opens it when you press the shortcut with no text field in front (the desktop, the
// taskbar, no window) and sends the dictated words here directly, so the clipboard is never touched. It saves itself to
// My own notes, and its radial menu formats, converts, shares or reads the text.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { RadialMenu } from "@/components/RadialMenu";
import { ReaderBar } from "@/components/ReaderBar";
import { diffWords } from "@/lib/speech/format";
import { notesDb, type Note } from "@/lib/local-db";
import { newNote } from "@/lib/notes";
import type { ActionResult } from "@/lib/textActions";

type NoteMsg = { type: "text"; text: string } | { type: "undo" } | { type: "replace"; count: number; text: string };
const bridge = () => (window as unknown as { kelados?: { onNote?(cb: (m: NoteMsg) => void): void } }).kelados;

export default function StickyNote() {
  const [note] = useState<Note>(() => newNote("personal"));
  const [text, setText] = useState("");
  const [menu, setMenu] = useState<{ x: number; y: number; from: number; to: number } | null>(null);
  const [toast, setToast] = useState<{ message: string; undo?: string } | null>(null);
  // A suggested rewrite of part of the note (Refine), shown under it until accepted or discarded.
  const [suggestion, setSuggestion] = useState<{ from: number; to: number; before: string; after: string } | null>(null);
  const [savedText, setSavedText] = useState(""); // what was last written to the database
  const textRef = useRef(text);
  const pieces = useRef<string[]>([]); // what each dictated phrase added, for "scratch that"
  const area = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => { textRef.current = text; });

  const apply = (next: string) => { textRef.current = next; setText(next); };

  // Dictation from the desktop app: append phrases, undo the last one, or apply a voice edit.
  useEffect(() => {
    bridge()?.onNote?.((m) => {
      const t = textRef.current;
      if (m.type === "text") {
        const add = !t || /\s$/.test(t) ? m.text.trimStart() : /^[\s,.;:!?]/.test(m.text) ? m.text : ` ${m.text}`;
        pieces.current.push(add);
        apply(t + add);
      } else if (m.type === "undo") {
        const last = pieces.current.pop();
        if (last && t.endsWith(last)) apply(t.slice(0, -last.length).trimEnd());
      } else {
        const chars = [...t];
        apply(chars.slice(0, Math.max(0, chars.length - m.count)).join("") + m.text);
        pieces.current = [];
      }
      requestAnimationFrame(() => area.current?.scrollTo({ top: area.current.scrollHeight }));
    });
    area.current?.focus();
  }, []);

  // Saved as you go, titled by its first line.
  useEffect(() => {
    if (!text.trim()) return;
    const t = setTimeout(() => {
      notesDb.put({ ...note, title: text.trim().split("\n")[0].slice(0, 60), scratch: text, updatedAt: Date.now() })
        .then(() => setSavedText(text)).catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [text, note]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  // The menu works on the selection if there is one, otherwise on the whole note.
  const openMenu = (x: number, y: number) => {
    const a = area.current!;
    const sel = a.selectionStart !== a.selectionEnd;
    setMenu({ x, y, from: sel ? a.selectionStart : 0, to: sel ? a.selectionEnd : text.length });
  };
  const onResult = (r: ActionResult) => {
    if (r.suggest && r.text !== undefined && menu) {
      const before = text.slice(menu.from, menu.to);
      if (r.text.trim() === before.trim()) setToast({ message: "Already reads well, nothing to change" });
      else setSuggestion({ from: menu.from, to: menu.to, before, after: r.text });
    } else if (r.text !== undefined && menu) {
      const before = text;
      apply(text.slice(0, menu.from) + r.text + text.slice(menu.to));
      pieces.current = [];
      setToast({ message: r.message, undo: before });
    } else if (r.message) setToast({ message: r.message });
  };

  return (
    <div className="app-ui flex h-dvh flex-col overflow-hidden">
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-line pl-4 pr-2 [-webkit-app-region:drag]">
        <span className="size-2 rounded-full bg-accent" />
        <span className="text-sm font-bold">Note</span>
        <span className="ml-auto flex gap-1 [-webkit-app-region:no-drag]">
          <button onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); openMenu(window.innerWidth / 2, r.bottom + 170); }}
            disabled={!text.trim()} className="rounded-lg px-2.5 py-1 text-xs font-semibold text-muted hover:bg-elevated hover:text-fg disabled:opacity-40">Actions</button>
          <button onClick={() => window.close()} aria-label="Close note" className="grid size-7 place-items-center rounded-lg text-muted hover:bg-elevated hover:text-fg">✕</button>
        </span>
      </header>

      <textarea ref={area} value={text} onChange={(e) => { apply(e.target.value); pieces.current = []; }}
        onContextMenu={(e) => { if (!text.trim()) return; e.preventDefault(); openMenu(e.clientX, e.clientY); }}
        placeholder="Talk, and your words appear here. Right-click for actions."
        className="min-h-0 flex-1 resize-none bg-surface px-4 py-3 text-[15px] leading-relaxed text-fg placeholder:text-subtle" style={{ outline: "none" }} />

      {suggestion && <Suggestion s={suggestion}
        onAccept={() => { const old = text; apply(text.slice(0, suggestion.from) + suggestion.after + text.slice(suggestion.to)); pieces.current = []; setSuggestion(null); setToast({ message: "Refined", undo: old }); }}
        onDiscard={() => setSuggestion(null)} />}
      <ReaderBar className="mx-3 mb-2" />
      <footer className="flex h-8 shrink-0 items-center justify-between border-t border-line px-4 text-[11px] text-subtle">
        <span>{text.trim() ? (savedText === text ? "Saved to My own notes" : "Saving…") : "Ctrl+Shift+Space to talk"}</span>
        <span>{text.trim() ? `${text.trim().split(/\s+/).length} words` : ""}</span>
      </footer>

      {menu && <RadialMenu text={text.slice(menu.from, menu.to)} at={{ x: menu.x, y: menu.y }} onResult={onResult} onClose={() => setMenu(null)} />}
      {toast && (
        <div role="status" className="absolute bottom-11 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full bg-fg px-4 py-2 text-xs font-semibold text-bg shadow-lg">
          {toast.message}
          {toast.undo !== undefined && <button onClick={() => { apply(toast.undo!); setToast(null); }} className="underline underline-offset-2">Undo</button>}
        </div>
      )}
    </div>
  );
}

/** The refined version under the note: removed words struck through, new ones highlighted; + accepts, − discards. */
function Suggestion({ s, onAccept, onDiscard }: { s: { before: string; after: string }; onAccept: () => void; onDiscard: () => void }) {
  const parts = diffWords(s.before, s.after);
  const changes = parts.filter((p) => p.kind === "add").length;
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onDiscard(); else if (e.key === "Enter" && e.ctrlKey) onAccept(); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onAccept, onDiscard]);
  return (
    <section aria-label="Suggested refinement" className="glass mx-3 mb-2 flex max-h-[45%] min-h-0 flex-col rounded-2xl" style={{ animation: "kel-band-in 220ms ease-out both" }}>
      <header className="flex items-center gap-2 px-3.5 pt-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent">Refined</span>
        <span className="text-[11px] text-subtle">{changes} {changes === 1 ? "change" : "changes"}</span>
        <span className="ml-auto flex gap-1.5">
          <button onClick={onDiscard} aria-label="Discard the suggestion" title="Discard (Esc)"
            className="grid size-7 place-items-center rounded-full border border-line-strong text-muted transition-colors hover:border-fg hover:text-fg">
            <svg viewBox="0 0 24 24" width={14} height={14} stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden><path d="M5 12h14" /></svg>
          </button>
          <button onClick={onAccept} aria-label="Accept the suggestion" title="Accept (Ctrl+Enter)"
            className="grid size-7 place-items-center rounded-full bg-fg text-bg transition-transform hover:scale-105">
            <svg viewBox="0 0 24 24" width={14} height={14} stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
          </button>
        </span>
      </header>
      <p className="min-h-0 overflow-y-auto whitespace-pre-wrap px-3.5 pb-3 pt-2 text-[14px] leading-relaxed text-fg">
        {parts.map((p, i) => p.kind === "same" ? <span key={i}>{p.text}</span>
          : p.kind === "del" ? <del key={i} className="text-subtle decoration-subtle/70">{p.text}</del>
          : <ins key={i} className="rounded-[4px] bg-accent/15 px-0.5 text-fg no-underline decoration-accent">{p.text}</ins>)}
      </p>
    </section>
  );
}

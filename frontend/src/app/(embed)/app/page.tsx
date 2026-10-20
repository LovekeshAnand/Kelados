"use client";
// The desktop app's main window: home, dictionary, meeting notes, style, settings and help. Same origin as the
// dictation overlay, so settings apply live and the overlay's saved dictations show up here as they happen.
// Routes are hash-based (#notes/abc123) so the static export needs no extra pages.
import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { ModelStorage } from "@/components/ModelStorage";
import { LiveSession } from "@/components/notes/LiveSession";
import { NoteView } from "@/components/notes/NoteView";
import { SnippetEditor } from "@/components/SnippetEditor";
import { RadialMenu } from "@/components/RadialMenu";
import { ReaderBar } from "@/components/ReaderBar";
import { Spinner } from "@/components/ui";
import { Wordmark } from "@/components/Wordmark";
import { useAuth } from "@/lib/api";
import { copyText } from "@/lib/clipboard";
import { REWIND_SECONDS } from "@/lib/engine/rewind";
import { STT_MODELS } from "@/lib/engine/stt";
import { dictationsDb, notesDb, onDictationsChanged, type Dictation, type Note } from "@/lib/local-db";
import { useLocal, writeLocal } from "@/lib/local-store";
import { cleanup } from "@/lib/speech/cleanup";
import { LANGUAGES, useDictateSettings } from "@/lib/speech/settings";
import { useSnippets } from "@/lib/speech/snippets";
import { clock } from "@/lib/subtitles";
import type { ActionResult } from "@/lib/textActions";
import { useTheme } from "@/lib/theme";

type Section = "home" | "dictionary" | "notes" | "style" | "settings" | "help";
const GROUPS: [string, [Section, string][]][] = [
  ["Write", [["home", "Home"], ["dictionary", "Dictionary"], ["style", "Style"]]],
  ["Meet", [["notes", "Meeting notes"]]],
  ["App", [["settings", "Settings"], ["help", "Help"]]],
];
const SECTIONS = GROUPS.flatMap(([, items]) => items.map(([id]) => id));
const go = (hash: string) => { location.hash = hash; };

const ICONS: Record<string, string> = {
  home: "M4 10.5 12 4l8 6.5V20h-5.5v-5h-5v5H4z",
  dictionary: "M7 4h10a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2V6a2 2 0 0 1 2-2zM9 9h6M9 13h4",
  notes: "M4 12a8 8 0 1 0 16 0 8 8 0 0 0-16 0m5 0h.01M12 12h.01M15 12h.01",
  style: "M5 19 12 5l7 14M8 14h8",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.6 7.6 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.6 7.6 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z",
  help: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 0 1 4.9.7c0 1.6-2.4 2-2.4 3.3M12 17h.01",
  sun: "M12 4V2m0 20v-2m8-8h2M2 12h2m13.7-5.7 1.4-1.4M4.9 19.1l1.4-1.4m0-11.4L4.9 4.9m14.2 14.2-1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  moon: "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm10 2-4.3-4.3",
  close: "M6 6l12 12M18 6 6 18",
  back: "M15 18l-6-6 6-6",
  doc: "M6 3h9l4 4v14H6zM9 12h7M9 16h7",
  mic: "M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm-6-3a6 6 0 0 0 12 0M12 18v3",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18",
};
const Icon = ({ name, className = "size-4" }: { name: string; className?: string }) => (
  <svg viewBox="0 0 24 24" className={`${className} shrink-0`} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={ICONS[name]} />
  </svg>
);

const panel = "rounded-2xl border border-line bg-elevated/40";
const field = "rounded-xl border border-line bg-surface px-3 py-2 text-sm text-fg placeholder:text-subtle focus:border-line-strong focus:outline-none focus:ring-2 focus:ring-accent/25";
const primary = "inline-flex items-center gap-2 rounded-xl bg-fg px-4 py-2 text-sm font-semibold text-bg transition-opacity hover:opacity-85";
const ghost = "rounded-lg px-2.5 py-1 text-xs font-semibold text-muted hover:bg-elevated hover:text-fg";
const eyebrow = "text-[10.5px] font-bold uppercase tracking-[0.12em] text-subtle";
const onBanner = { solid: "rounded-xl bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-white/90", soft: "rounded-xl bg-white/12 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/15 backdrop-blur hover:bg-white/20" };

const dayKey = (t: number) => new Date(t).toDateString();

function Keys({ keys, dark }: { keys: string; dark?: boolean }) {
  return (
    <span className="inline-flex gap-1 align-middle">
      {keys.split("+").map((k) => (
        <kbd key={k} className={`rounded-md border px-1.5 py-px font-sans text-[11px] font-semibold ${dark ? "border-white/25 bg-white/10 text-white" : "border-line-strong bg-surface text-fg shadow-[0_1px_0_var(--color-line-strong)]"}`}>{k}</kbd>
      ))}
    </span>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? "bg-accent" : "bg-line-strong"}`}>
      <span className={`absolute top-0.5 size-4 rounded-full bg-white shadow-sm transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
    </button>
  );
}

function Row({ title, children, control }: { title: string; children?: React.ReactNode; control?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-line px-5 py-4 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        {children && <div className="mt-0.5 text-[13px] leading-relaxed text-muted">{children}</div>}
      </div>
      {control && <div className="shrink-0">{control}</div>}
    </div>
  );
}

function Title({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <header className="mb-6 flex items-center justify-between gap-4">
      <h1 className="text-[26px] font-bold tracking-tight">{children}</h1>
      {action}
    </header>
  );
}

const Heading = ({ children }: { children: string }) => <h2 className={`${eyebrow} mb-2.5 mt-9`}>{children}</h2>;

/** A dark editorial banner with the Kelados butterfly. Dismissible; the choice is remembered. */
function Banner({ id, title, children, actions }: { id: string; title: React.ReactNode; children: React.ReactNode; actions?: React.ReactNode }) {
  const hidden = useLocal<string[]>("kelados:banners", []);
  if (hidden.includes(id)) return null;
  return (
    <section className="relative mb-8 overflow-hidden rounded-3xl text-white shadow-[0_20px_50px_-20px_rgb(0_0_0/0.5)]"
      style={{ background: "radial-gradient(120% 160% at 88% 30%, #6b2448 0%, #2a1020 42%, #0e0a0d 78%)" }}>
      <div aria-hidden className="pointer-events-none absolute -right-16 top-1/2 h-[175%] w-[60%] -translate-y-1/2 bg-contain bg-center bg-no-repeat opacity-80 mix-blend-screen"
        style={{ backgroundImage: "url(/art/butterfly-dots.webp)" }} />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,#0e0a0d_0%,#0e0a0dcc_35%,transparent_70%)]" />
      <div className="relative max-w-[34rem] px-8 py-8">
        <h2 className="font-[family-name:var(--font-serif)] text-[40px] leading-[1.05] tracking-[-0.01em] [&_i]:text-[#ffc2dc]">{title}</h2>
        <div className="mt-3 text-[15px] leading-relaxed text-white/75">{children}</div>
        {actions && <div className="mt-6 flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <button onClick={() => writeLocal("kelados:banners", [...hidden, id])} aria-label="Hide this banner"
        className="absolute right-3 top-3 grid size-7 place-items-center rounded-full bg-black/50 text-white/80 ring-1 ring-white/15 backdrop-blur hover:bg-black/70 hover:text-white">
        <Icon name="close" className="size-3.5" />
      </button>
    </section>
  );
}

function Empty({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className={`${panel} grid place-items-center px-6 py-14 text-center`}>
      <span className="grid size-11 place-items-center rounded-2xl bg-elevated text-muted"><Icon name={icon} className="size-5" /></span>
      <p className="mt-4 font-semibold">{title}</p>
      <div className="mt-1 max-w-sm text-sm text-muted">{children}</div>
    </div>
  );
}

const SAMPLES = [
  "um so let's meet on friday at 9 pm no wait wednesday at 8 pm",
  "hey priya new line can you send me the deck question mark",
  "shopping list bullet point eggs bullet point milk bullet point coffee",
  "i think the the launch went uh really well comma honestly",
];

/** Type how you'd talk and see what Kelados writes, with your own settings and dictionary. Runs the real cleanup. */
function Playground() {
  const { settings } = useDictateSettings();
  const { items: snippets } = useSnippets();
  const [said, setSaid] = useState(SAMPLES[0]);
  const out = cleanup(said, { fillers: settings.fillers, commands: settings.commands, snippets }).text;
  return (
    <div className={`${panel} overflow-hidden`}>
      <div className="px-4 pb-3 pt-4">
        <p className="text-sm font-bold">Cleanup playground</p>
        <p className="mt-0.5 text-xs text-muted">Type how you&apos;d talk. See what Kelados writes.</p>
      </div>
      <label className="block border-t border-line px-4 py-3">
        <span className={eyebrow}>You say</span>
        <textarea value={said} onChange={(e) => setSaid(e.target.value)} rows={3} className="mt-1 w-full resize-none bg-transparent text-sm leading-relaxed text-muted focus:outline-none" />
      </label>
      <div className="border-t border-line bg-accent-soft px-4 py-3">
        <span className={`${eyebrow} !text-accent`}>Kelados writes</span>
        <p className="mt-1 min-h-[2.75em] whitespace-pre-wrap text-sm font-semibold leading-relaxed">{out || "…"}</p>
      </div>
      <div className="flex items-center gap-1 border-t border-line p-2">
        {SAMPLES.map((s, i) => (
          <button key={s} onClick={() => setSaid(s)} aria-label={`Example ${i + 1}`}
            className={`grid size-7 place-items-center rounded-lg text-xs font-bold ${said === s ? "bg-fg text-bg" : "text-muted hover:bg-elevated"}`}>{i + 1}</button>
        ))}
        <span className="ml-auto pr-2 text-[11px] text-subtle">Examples</span>
      </div>
    </div>
  );
}

function QuickActions() {
  const tiles: [string, string, string, string][] = [
    ["notes", "Start a meeting", "Live transcript", "notes/new"],
    ["dictionary", "Add a word", "Names and jargon", "dictionary"],
    ["globe", "Language", "Hinglish, Hindi and more", "style"],
    ["help", "Get help", "Tips and fixes", "help"],
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {tiles.map(([icon, title, sub, to]) => (
        <button key={title} onClick={() => go(to)} className="group rounded-2xl border border-line bg-elevated/40 p-3 text-left transition-colors hover:border-accent/50">
          <span className="grid size-8 place-items-center rounded-xl bg-elevated text-muted transition-colors group-hover:bg-accent group-hover:text-bg"><Icon name={icon} /></span>
          <span className="mt-2.5 block text-[13px] font-bold">{title}</span>
          <span className="block text-[11px] text-subtle">{sub}</span>
        </button>
      ))}
    </div>
  );
}

function Home({ items, remove }: { items: Dictation[]; remove: (id: string) => void }) {
  const { user } = useAuth();
  const { settings, update } = useDictateSettings();
  const [q, setQ] = useState("");
  const [menu, setMenu] = useState<{ x: number; y: number; text: string } | null>(null);
  const [toast, setToast] = useState("");
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(t);
  }, [toast]);
  // History is a record, so a Format result is copied rather than overwriting what you dictated.
  const onResult = (r: ActionResult) => {
    if (r.text !== undefined) copyText(r.text).then(() => setToast(`${r.message} (copied)`), () => setToast(r.message));
    else if (r.message) setToast(r.message);
  };
  const [now] = useState(Date.now);
  const shown = q ? items.filter((d) => d.text.toLowerCase().includes(q.toLowerCase())) : items;
  const groups = useMemo(() => {
    const g = new Map<string, Dictation[]>();
    for (const d of shown) g.set(dayKey(d.createdAt), [...(g.get(dayKey(d.createdAt)) ?? []), d]);
    return [...g];
  }, [shown]);
  const today = dayKey(now), yesterday = dayKey(now - 864e5);
  const label = (k: string) => (k === today ? "Today" : k === yesterday ? "Yesterday" : new Date(k).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }));

  return (
    <>
      <Title>Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}</Title>
      <Banner id="home-1" title={<>Talk. <i>It types.</i></>}
        actions={<><span className="mr-2 flex items-center gap-2 text-sm text-white/70">Press <Keys keys="Ctrl+Shift+Space" dark /> anywhere</span>
          <button className={onBanner.soft} onClick={() => go("style")}>What can I say?</button></>}>
        Speak naturally in any app and pause. Kelados writes it where your cursor is, cleans up the ums, and keeps everything on this computer.
      </Banner>

      <div className="grid gap-8 xl:grid-cols-[1fr_288px]">
        <div className="min-w-0">
          {items.length === 0 ? (
            <div className={`${panel} p-6`}>
              <h2 className="font-bold">Try your first dictation</h2>
              <p className="mt-1 text-sm text-muted">Click in the box, press <Keys keys="Ctrl+Shift+Space" />, say a sentence and pause. Press the shortcut again to stop.</p>
              <textarea rows={4} placeholder="Your words will appear here" className={`${field} mt-4 w-full resize-none text-[15px]`} />
            </div>
          ) : (
            <>
              <div className="relative">
                <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your dictations" aria-label="Search your dictations" className={`${field} w-full pl-9`} />
              </div>
              {groups.map(([k, list]) => (
                <section key={k}>
                  <Heading>{label(k)}</Heading>
                  <ul className="space-y-2">
                    {list.map((d) => (
                      <li key={d.id} className="group relative rounded-2xl border border-line bg-elevated/40 px-5 py-4 transition-colors hover:border-line-strong">
                        <time className="text-[11px] font-semibold tabular-nums text-subtle">{new Date(d.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time>
                        <p className="mt-1 whitespace-pre-wrap text-[14.5px] leading-relaxed">{d.text}</p>
                        <div className="absolute right-3 top-3 flex rounded-xl border border-line bg-surface opacity-0 shadow-sm transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                          <button className={ghost} onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setMenu({ x: r.left + r.width / 2, y: r.bottom + 120, text: d.text }); }}>Actions</button>
                          <button className={ghost} onClick={() => copyText(d.text)}>Copy</button>
                          <button className={ghost} onClick={() => remove(d.id)}>Delete</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
              {!shown.length && <p className="mt-6 text-sm text-muted">No dictations match &ldquo;{q}&rdquo;.</p>}
            </>
          )}
        </div>

        <aside className="space-y-4">
          <Playground />
          <QuickActions />
          <div className={`${panel} p-4`}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">Rewind</p>
              <Toggle on={settings.rewind} onChange={(rewind) => update({ rewind })} label="Rewind" />
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted"><Keys keys="Ctrl+Alt+R" /> types what you said in the last {REWIND_SECONDS} seconds. Audio stays in memory only.</p>
          </div>
        </aside>
      </div>
      <ReaderBar className="fixed bottom-6 left-1/2 z-40 w-[min(560px,calc(100%-48px))] -translate-x-1/2" />
      {menu && <RadialMenu text={menu.text} at={{ x: menu.x, y: menu.y }} onResult={onResult} onClose={() => setMenu(null)} />}
      {toast && <div role="status" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-fg px-4 py-2 text-xs font-semibold text-bg shadow-lg">{toast}</div>}
    </>
  );
}

function Dictionary() {
  const { items, save } = useSnippets();
  const add = () => save([...items, { trigger: "", text: "" }]);
  const examples = items.filter((s) => s.text.trim()).slice(0, 4).map((s) => s.text);
  return (
    <>
      <Title action={<button className={primary} onClick={add}>Add new</button>}>Dictionary</Title>
      <Banner id="dictionary-1" title={<>Kelados spells it <i>your</i> way.</>}
        actions={<><button className={onBanner.solid} onClick={add}>Add new word</button>
          {(examples.length ? examples : ["Kelados", "Priya", "Wispr Flow"]).map((w) => <span key={w} className={onBanner.soft}>{w}</span>)}</>}>
        Add names, jargon and phrases once, and they&apos;re spelled right in every dictation. Kelados also learns the names you use as you talk.
      </Banner>
      <div className={`${panel} p-5`}><SnippetEditor /></div>
    </>
  );
}

function Notes({ arg }: { arg: string }) {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [open, setOpen] = useState<Note | null | undefined>(undefined);
  useEffect(() => {
    if (arg && arg !== "new") notesDb.get(arg).then((n) => setOpen(n ?? null));
    else notesDb.list().then(setNotes).catch(() => setNotes([]));
  }, [arg]);
  const back = <button onClick={() => go("notes")} className="mb-5 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-fg"><Icon name="back" />All notes</button>;

  if (arg === "new") return <>{back}<LiveSession onDone={(id) => go(`notes/${id}`)} /></>;
  if (arg) return <>{back}{open ? <NoteView key={open.id} initial={open} onDelete={() => go("notes")} /> : open === null ? <p className="text-sm text-muted">This note no longer exists.</p> : <Spinner />}</>;

  return (
    <>
      <Title action={<button className={primary} onClick={() => go("notes/new")}><Icon name="mic" />Start a meeting</button>}>Meeting notes</Title>
      <Banner id="notes-1" title={<>Meetings, <i>written down.</i></>}
        actions={<><button className={onBanner.solid} onClick={() => go("notes/new")}>Start a meeting</button><button className={onBanner.soft} onClick={() => go("notes/new")}>Write a note</button></>}>
        A live transcript with you and everyone else labelled, then highlights, action items and decisions the moment you stop. No bot joins your call.
      </Banner>
      {notes === null ? <Spinner /> : notes.length === 0 ? (
        <Empty icon="doc" title="Your meetings will appear here">Start a meeting, share the call&apos;s browser tab, and Kelados writes it all down on this computer.</Empty>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {notes.map((n) => (
            <li key={n.id}>
              <button onClick={() => go(`notes/${n.id}`)} className="flex h-full w-full flex-col rounded-2xl border border-line bg-elevated/40 p-5 text-left transition-colors hover:border-accent/50">
                <span className="flex items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-lg bg-elevated text-muted"><Icon name={n.kind === "personal" ? "doc" : "notes"} className="size-3.5" /></span>
                  <span className={eyebrow}>{n.kind === "personal" ? "Note" : "Meeting"}</span>
                  <span className="ml-auto text-[11px] font-semibold tabular-nums text-subtle">{new Date(n.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {clock(n.duration)}</span>
                </span>
                <span className="mt-3 block truncate text-[15px] font-bold">{n.title}</span>
                <span className="mt-1 line-clamp-2 block text-sm text-muted">{(n.kind === "personal" ? n.scratch : n.lines.slice(0, 4).map((l) => l.text).join(" ")) || "Empty"}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

const SAY = [
  ["new line, new paragraph, bullet point", "Formatting"],
  ["comma, question mark, full stop", "Punctuation"],
  ["scratch that", "Deletes the last phrase"],
  ["Friday at 9, no wait, Wednesday at 8", "Keeps only the correction"],
  ["(after it's typed) no no, make it Saturday", "Fixes the text already typed"],
  ["change coffee to tea", "Replaces a word you already said"],
  ["make that a bullet list", "Turns the last sentence into a list"],
  ["press enter, send it", "Presses Enter (said on its own)"],
  ["select all, copy that, paste", "Edits in the current app"],
  ["नई लाइन, पूर्ण विराम, नहीं नहीं, भेजो", "The same in Hindi"],
];

function Style() {
  const { settings, update, setLanguage } = useDictateSettings();
  return (
    <>
      <Title>Style</Title>
      <Banner id="style-1" title={<>Sound like <i>you</i>, minus the ums.</>}>
        Kelados drops filler words, follows your mid-sentence corrections and learns the words you use. Choose exactly what it does.
      </Banner>
      <div className={panel}>
        <Row title="Language" control={
          <select value={settings.language} onChange={(e) => setLanguage(e.target.value)} className={`${field} w-52`} aria-label="Language">
            {LANGUAGES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
          </select>}>
          Hinglish writes Hindi and English in English letters and is fast. Hindi writes Devanagari and is slower. Each engine downloads once.
        </Row>
        <Row title="Remove filler words" control={<Toggle on={settings.fillers} onChange={(fillers) => update({ fillers })} label="Remove filler words" />}>
          Drops um, uh and repeated words.
        </Row>
        <Row title="Voice commands and corrections" control={<Toggle on={settings.commands} onChange={(commands) => update({ commands })} label="Voice commands and corrections" />}>
          Change your mind mid-sentence and only the final version is typed. Spoken keys like &ldquo;press enter&rdquo; work too.
        </Row>
        <Row title="Learn from my writing" control={<Toggle on={settings.learn} onChange={(learn) => update({ learn })} label="Learn from my writing" />}>
          Picks up the names, brands and terms you use and fixes them when the speech model mishears.
        </Row>
      </div>

      <Heading>What you can say</Heading>
      <dl className={`${panel} divide-y divide-line`}>
        {SAY.map(([say, does]) => (
          <div key={say} className="flex justify-between gap-4 px-5 py-3 text-sm"><dt className="font-medium">&ldquo;{say}&rdquo;</dt><dd className="text-right text-muted">{does}</dd></div>
        ))}
      </dl>
    </>
  );
}

const platform = () => (/Mac/i.test(navigator.platform) ? "mac" : /Linux/i.test(navigator.platform) ? "linux" : "windows");

function Settings() {
  const { settings, update } = useDictateSettings();
  const [theme, setTheme] = useTheme();
  const [copied, setCopied] = useState(false);
  const os = useSyncExternalStore(() => () => {}, platform, () => "windows");
  const updateCmd = os === "windows" ? "irm https://kelados.in/install.ps1 | iex" : "curl -fsSL https://kelados.in/install.sh | sh";
  return (
    <>
      <Title>Settings</Title>
      <div className={panel}>
        <Row title="Appearance" control={
          <div className="flex rounded-xl border border-line bg-surface p-0.5" role="radiogroup" aria-label="Appearance">
            {(["dark", "light"] as const).map((t) => (
              <button key={t} role="radio" aria-checked={theme === t} onClick={() => setTheme(t)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold capitalize ${theme === t ? "bg-elevated text-fg shadow-sm" : "text-muted hover:text-fg"}`}>
                <Icon name={t === "dark" ? "moon" : "sun"} className="size-3.5" />{t}
              </button>
            ))}
          </div>} />
        <Row title="Speech engine" control={
          <select value={settings.model} onChange={(e) => update({ model: e.target.value })} className={`${field} w-60`} aria-label="Speech engine">
            {STT_MODELS.map((m) => <option key={m.id} value={m.id}>{m.name} · {m.note.split(" · ")[1]}</option>)}
          </select>}>
          Picked for you when you choose a language in Style. Moonshine shows words as you speak (English). Hinglish and Hindi are tuned for Indian speech. Whisper covers 99 languages.
        </Row>
        <Row title={`Microphone sensitivity (${settings.sensitivity.toFixed(1)}×)`} control={
          <input type="range" min={0.5} max={2.5} step={0.1} value={settings.sensitivity} onChange={(e) => update({ sensitivity: +e.target.value })} className="w-36" aria-label="Microphone sensitivity" />}>
          Raise it if quiet words are missed. Lower it in a noisy room.
        </Row>
        <Row title="Rewind" control={<Toggle on={settings.rewind} onChange={(rewind) => update({ rewind })} label="Rewind" />}>
          Keeps the last {REWIND_SECONDS} seconds of microphone audio in memory, so it can be typed after you&apos;ve said it. The microphone stays on while this is enabled. Nothing is saved or sent.
        </Row>
      </div>

      <Heading>Shortcuts</Heading>
      <div className={panel}>
        <Row title="Start or stop dictation" control={<Keys keys="Ctrl+Shift+Space" />} />
        <Row title="Read selected text aloud" control={<Keys keys="Ctrl+Alt+S" />} />
        <Row title="Rewind the last 30 seconds" control={<Keys keys="Ctrl+Alt+R" />}>When Rewind is on.</Row>
        <Row title="Make this window larger or smaller" control={<span className="flex gap-2"><Keys keys="Ctrl+=" /><Keys keys="Ctrl+-" /></span>} />
      </div>

      <Heading>Updates</Heading>
      <div className={panel}>
        <Row title="Update Kelados" control={
          <button onClick={() => { copyText(updateCmd); setCopied(true); }} className="rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-semibold hover:bg-elevated">{copied ? "Copied" : "Copy command"}</button>}>
          Kelados tells you when an update is ready and installs it from the tray menu. To update by hand, run this in {os === "windows" ? "PowerShell" : "Terminal"}:
          <code className="mt-2 block rounded-xl bg-surface px-3 py-2 font-mono text-xs text-fg">{updateCmd}</code>
        </Row>
      </div>

      <Heading>Storage</Heading>
      <div className={`${panel} p-5`}><ModelStorage /></div>
    </>
  );
}

function Help() {
  const steps: [string, React.ReactNode][] = [
    ["Dictate anywhere", <>Click where you want to type, press <Keys keys="Ctrl+Shift+Space" />, talk in full sentences and pause. Press it again to stop.</>],
    ["Fix things by voice", <>Say &ldquo;scratch that&rdquo; to remove the last phrase, or just correct yourself: &ldquo;at 4, no wait, 5&rdquo;.</>],
    ["Record a meeting", <>Open Meeting notes, start a meeting and share the call&apos;s browser tab. You and the others are labelled.</>],
    ["Listen instead of reading", <>Select text anywhere and press <Keys keys="Ctrl+Alt+S" />.</>],
  ];
  return (
    <>
      <Title>Help</Title>
      <div className="grid gap-3 sm:grid-cols-2">
        {steps.map(([t, d], i) => (
          <div key={t} className={`${panel} p-5`}>
            <span className="grid size-8 place-items-center rounded-xl bg-accent text-sm font-bold text-bg">{i + 1}</span>
            <p className="mt-3 font-bold">{t}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">{d}</p>
          </div>
        ))}
      </div>
      <Heading>Something not working?</Heading>
      <div className={panel}>
        <Row title="Words are misheard">Speak in full sentences and pause at the end. If you mix Hindi and English, choose Hinglish in Style; for Hindi script, choose Hindi.</Row>
        <Row title="Text doesn't appear">Click into the app first so it has a cursor. On a Mac, allow Kelados under System Settings → Privacy &amp; Security → Accessibility.</Row>
        <Row title="Words are missed">Raise the microphone sensitivity in Settings.</Row>
        <Row title="Report a problem" control={<a href="https://github.com/LovekeshAnand/Kelados/issues" className="rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-semibold hover:bg-elevated">Open GitHub</a>}>Kelados is open source; issues and ideas are welcome.</Row>
      </div>
    </>
  );
}

export default function AppHome() {
  const [route, setRoute] = useState("home");
  const [items, setItems] = useState<Dictation[]>([]);
  const [theme, setTheme] = useTheme();
  const desktop = useSyncExternalStore(() => () => {}, () => /Electron\//.test(navigator.userAgent), () => true);
  const mac = useSyncExternalStore(() => () => {}, () => /Mac/i.test(navigator.platform), () => false);
  const [section, ...rest] = route.split("/");
  const arg = rest.join("/");
  const current: Section = (SECTIONS as string[]).includes(section) ? (section as Section) : "home";

  useEffect(() => {
    const fromHash = () => setRoute(location.hash.slice(1) || "home");
    fromHash();
    window.addEventListener("hashchange", fromHash);
    const load = () => dictationsDb.list().then(setItems).catch(() => {});
    load();
    const off = onDictationsChanged(load);
    window.addEventListener("focus", load);
    return () => { window.removeEventListener("hashchange", fromHash); window.removeEventListener("focus", load); off(); };
  }, []);

  const remove = (id: string) => { dictationsDb.remove(id); setItems((x) => x.filter((d) => d.id !== id)); };

  return (
    <div className="app-ui flex h-dvh flex-col overflow-hidden">
      {/* Title bar: drag to move the window; Windows draws its buttons on the right, macOS its lights on the left. */}
      <div className={`flex h-11 shrink-0 items-center [-webkit-app-region:drag] ${mac ? "pl-[84px]" : "pl-5"}`}>
        <Link href="/app/" className="text-fg [-webkit-app-region:no-drag]" aria-label="Kelados home"><Wordmark className="h-[16px]" /></Link>
      </div>

      <div className="flex min-h-0 flex-1">
        <nav aria-label="Kelados" className="flex w-60 shrink-0 flex-col overflow-y-auto px-3 pb-3 pt-1 max-md:w-[4.5rem] max-md:[&_.lbl]:sr-only">
          {/* Status card: the shortcut, and whether the app is listening for it. */}
          <div className="mb-5 rounded-2xl border border-line bg-surface p-3 max-md:hidden">
            <p className="flex items-center gap-2 text-xs font-bold">
              <span className="relative flex size-2">
                {desktop && <span className="absolute inline-flex size-full animate-ping rounded-full bg-ok/60" />}
                <span className={`relative size-2 rounded-full ${desktop ? "bg-ok" : "bg-line-strong"}`} />
              </span>
              {desktop ? "Ready to listen" : "Open the desktop app"}
            </p>
            <p className="mt-2.5"><Keys keys="Ctrl+Shift+Space" /></p>
          </div>

          {GROUPS.map(([group, list]) => (
            <div key={group} className="mb-4">
              <p className={`${eyebrow} lbl mb-1.5 px-2`}>{group}</p>
              {list.map(([id, name]) => {
                const on = current === id;
                return (
                  <a key={id} href={`#${id}`} aria-current={on ? "page" : undefined}
                    className={`group flex items-center gap-3 rounded-xl px-2 py-1.5 text-[14px] transition-colors max-md:justify-center ${on ? "font-bold text-fg" : "font-medium text-muted hover:text-fg"}`}>
                    <span className={`grid size-7 place-items-center rounded-lg transition-colors ${on ? "bg-accent text-bg shadow-[0_4px_14px_-4px_var(--color-accent)]" : "bg-elevated group-hover:bg-line"}`}>
                      <Icon name={id} className="size-[15px]" />
                    </span>
                    <span className="lbl">{name}</span>
                  </a>
                );
              })}
            </div>
          ))}

          <div className="mt-auto flex items-center justify-between rounded-2xl border border-line bg-surface p-1.5 max-md:flex-col max-md:gap-1">
            {(["light", "dark"] as const).map((t) => (
              <button key={t} onClick={() => setTheme(t)} aria-label={`${t} mode`} aria-pressed={theme === t}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-semibold capitalize transition-colors ${theme === t ? "bg-elevated text-fg shadow-sm" : "text-subtle hover:text-fg"}`}>
                <Icon name={t === "dark" ? "moon" : "sun"} className="size-3.5" /><span className="lbl">{t}</span>
              </button>
            ))}
          </div>
        </nav>

        <div className="mb-2 mr-2 min-w-0 flex-1 overflow-y-auto rounded-3xl border border-line bg-surface max-md:mr-0 max-md:rounded-r-none">
          <div className="mx-auto max-w-[1040px] px-10 py-9 max-md:px-5">
            {!desktop && (
              <p className="mb-6 rounded-xl border border-line bg-elevated/40 px-4 py-3 text-sm text-muted">
                This is the Kelados desktop app. <Link href="/download/" className="font-semibold text-fg underline underline-offset-2">Get the app</Link> to dictate into any program, or use <Link href="/dictate/" className="font-semibold text-fg underline underline-offset-2">Dictation</Link> in the browser.
              </p>
            )}
            {current === "home" && <Home items={items} remove={remove} />}
            {current === "dictionary" && <Dictionary />}
            {current === "notes" && <Notes arg={arg} />}
            {current === "style" && <Style />}
            {current === "settings" && <Settings />}
            {current === "help" && <Help />}
          </div>
        </div>
      </div>
    </div>
  );
}

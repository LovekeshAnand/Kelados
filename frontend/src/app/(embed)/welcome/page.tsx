"use client";
// Opened by the desktop app on first launch and from its tray icon. The overlay process owns the model, so this
// window doesn't load a second copy into memory.
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { card } from "@/components/ui";
import { Wordmark } from "@/components/Wordmark";

const isMac = () => /Mac/i.test(navigator.platform);
const noop = () => () => {};

function Key({ children }: { children: string }) {
  return <kbd className="display grid h-14 min-w-14 place-items-center rounded-sm border border-accent/40 bg-accent-soft px-4 text-2xl text-accent shadow-[0_3px_0_var(--color-accent-strong)]">{children}</kbd>;
}

const TIPS = [
  ["Talk naturally, then pause", "Each phrase is typed a moment after you stop speaking."],
  ["Say “new line” or “bullet point”", "Formatting by voice. “Scratch that” undoes the last phrase."],
  ["Works in any app", "Email, Slack, Word, Google Docs, VS Code, terminals and Claude Code."],
  ["Nothing leaves your computer", "Speech is recognised on this machine. No account needed."],
];

export default function Welcome() {
  const mac = useSyncExternalStore(noop, isMac, () => false);

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="dots pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-3xl space-y-8 px-6 py-12">
        <Wordmark className="h-7 text-accent" />
        <div>
          <h1 className="display text-6xl">You&apos;re all set</h1>
          <p className="mt-3 text-muted">
            Kelados runs in your {mac ? "menu bar" : "system tray (bottom-right, maybe under the ^ arrow)"}. Press the shortcut in any app, talk, and it types for you.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Key>{mac ? "⌘" : "Ctrl"}</Key><span className="text-subtle">+</span><Key>{mac ? "⇧" : "Shift"}</Key><span className="text-subtle">+</span><Key>Space</Key>
          <span className="ml-2 text-sm text-muted">to start, and again to stop</span>
        </div>

        <div className={`${card} p-5`}>
          <h2 className="label text-sm text-accent">Try it now</h2>
          <p className="mt-1 text-sm text-muted">Click in the box, press the shortcut, say &ldquo;Hello Kelados, this is my first dictation&rdquo;, pause, then press it again.</p>
          <textarea autoFocus rows={4} placeholder="Your words will be typed here…"
            className="mt-4 w-full resize-none rounded-sm border border-line bg-bg p-4 text-[17px] leading-relaxed placeholder:text-subtle focus:border-accent/50 focus:outline-none" />
          <p className="mt-3 text-xs text-subtle">The first time, Kelados downloads its speech model (a progress pill appears at the bottom of your screen). It stays on this computer, so every launch after that is instant.</p>
        </div>

        {mac && (
          <p className="rounded-sm border border-accent/30 bg-accent-soft p-4 text-sm text-accent">
            macOS asks for two permissions: <b>Microphone</b> (to hear you) and <b>Accessibility</b> (to type into other apps).
            If text doesn&apos;t appear, turn Kelados on in System Settings → Privacy &amp; Security → Accessibility, then restart it.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {TIPS.map(([t, d]) => (
            <div key={t} className="border-t border-accent/40 pt-3">
              <h3 className="display text-xl">{t}</h3>
              <p className="mt-1 text-sm text-muted">{d}</p>
            </div>
          ))}
        </div>

        <p className="text-sm text-muted">
          Change the model, mic sensitivity or cleanup rules, or add snippets and dictionary words, in{" "}
          <Link href="/dictate/" className="text-accent hover:underline">Settings</Link>. Turn on <b>Launch at login</b> from the tray menu to have it always ready.
        </p>
      </div>
    </div>
  );
}

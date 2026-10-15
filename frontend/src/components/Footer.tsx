import Link from "next/link";
import { Wordmark } from "./Wordmark";

export const GITHUB_URL = "https://github.com/LovekeshAnand/Kelados";

const COLS = [
  ["Product", [["/dictate/", "Dictation"], ["/notes/", "Notetaker"], ["/studio/", "Speech studio"], ["/projects/", "Projects"], ["/transcribe/", "Transcribe files"], ["/voices/", "Voice library"]]],
  ["Apps", [["/download/", "Desktop app"], ["/integrations/#chrome", "Chrome · Google Docs"], ["/integrations/#word", "Microsoft Word"], ["/integrations/#claude-code", "Claude Code"]]],
  ["Developers", [["/developers/", "SDK & CLI"], ["/developers/#server", "Self-hosted API"], ["/developers/#rest", "REST API"], ["/dashboard/?tab=keys", "API keys"]]],
  ["Project", [[GITHUB_URL, "GitHub"], ["/compare/", "Compare"], ["/#faq", "FAQ"], ["https://huggingface.co/hexgrad/Kokoro-82M", "Kokoro model"]]],
] as const;

export function Footer() {
  return (
    <footer className="relative mt-24 overflow-hidden border-t border-line">
      <div className="dots-ramp pointer-events-none absolute inset-0 opacity-40" />
      <div className="relative mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_repeat(4,1fr)] md:px-8">
        <div>
          <Wordmark className="h-8 text-accent" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
            κέλαδος, the sound of many voices. Speak to write, take notes, and give text a voice, on your own device.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 md:contents">
        {COLS.map(([title, links]) => (
          <div key={title}>
            <h3 className="label text-xs text-accent">{title}</h3>
            <ul className="mt-3 space-y-2">
              {links.map(([href, label]) => (
                <li key={href}><Link href={href} className="text-sm text-muted transition-colors hover:text-fg">{label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
        </div>
      </div>
      <div className="relative mx-auto flex max-w-7xl flex-wrap justify-between gap-2 border-t border-line px-5 py-6 font-mono text-[11px] text-subtle md:px-8">
        <span>© {new Date().getFullYear()} Kelados · MIT License</span>
        <span>Kokoro-82M · Whisper · Moonshine · transformers.js</span>
      </div>
    </footer>
  );
}

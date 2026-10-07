import Link from "next/link";
import { Logo } from "./Nav";

export const GITHUB_URL = "https://github.com/your-org/kelados";

const COLS = [
  ["Product", [["/studio/", "Speech studio"], ["/projects/", "Projects"], ["/transcribe/", "Speech to text"], ["/voices/", "Voice library"]]],
  ["Developers", [["/developers/", "SDK & CLI"], ["/developers/#server", "Self-hosted API"], ["/developers/#rest", "REST API"], ["/dashboard/?tab=keys", "API keys"]]],
  ["Project", [[GITHUB_URL, "GitHub"], ["/developers/#faq", "FAQ"], ["https://huggingface.co/hexgrad/Kokoro-82M", "Kokoro model"]]],
] as const;

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.5fr_1fr_1fr_1fr] md:px-8">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
            <span className="font-serif text-base italic text-fg">κέλαδος</span>: the sound of many voices. Free, open-source text-to-speech that runs on your own device.
          </p>
        </div>
        {COLS.map(([title, links]) => (
          <div key={title}>
            <h3 className="text-sm font-medium">{title}</h3>
            <ul className="mt-3 space-y-2">
              {links.map(([href, label]) => (
                <li key={href}><Link href={href} className="text-sm text-muted transition-colors hover:text-fg">{label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2 border-t border-line px-5 py-6 text-xs text-subtle md:px-8">
        <span>© {new Date().getFullYear()} Kelados · MIT License</span>
        <span>Voices by Kokoro-82M (Apache-2.0) · Runtime by transformers.js</span>
      </div>
    </footer>
  );
}

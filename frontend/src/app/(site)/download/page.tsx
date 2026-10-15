import type { Metadata } from "next";
import Link from "next/link";
import { GITHUB_URL } from "@/components/Footer";
import { btn, card, Kicker } from "@/components/ui";

export const metadata: Metadata = {
  title: "Download the Desktop App – Dictate Into Any App",
  description: "Free voice dictation for Windows, macOS and Linux. Press a shortcut, talk, and Kelados types into any app: Slack, VS Code, Word, your terminal or Claude Code.",
  openGraph: { title: "Kelados for Desktop", url: "/download/" },
};

const LATEST = `${GITHUB_URL}/releases/latest/download`;
const BUILDS = [
  ["Windows", "Windows 10 and 11 · 64-bit", `${LATEST}/Kelados-Setup.exe`],
  ["macOS", "Apple silicon and Intel", `${LATEST}/Kelados.dmg`],
  ["Linux", "AppImage · x64", `${LATEST}/Kelados.AppImage`],
] as const;

const STEPS = [
  ["01", "Install and open", "Kelados sits in your system tray. The first launch downloads the speech model once (about a minute)."],
  ["02", "Press Ctrl+Shift+Space", "Use ⌘+Shift+Space on a Mac. A small pill appears; your cursor stays where it was."],
  ["03", "Talk, then pause", "Each phrase is typed where your cursor is, cleaned up, with fillers removed and snippets expanded. Press the shortcut again to stop."],
];

export default function DownloadPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <div className="dots pointer-events-none absolute inset-0" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 md:px-8 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <Kicker>Desktop app</Kicker>
            <h1 className="display mt-5 text-[clamp(3.5rem,9vw,7.5rem)]">Talk into <span className="text-accent">any app</span></h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted">
              One shortcut, everywhere: email, Slack, VS Code, Google Docs, your terminal and Claude Code. Speech is recognised on your
              computer, so it works on confidential work and costs nothing.
            </p>
          </div>
          <div className="relative aspect-[3/2]">
            <div className="bloom pointer-events-none absolute inset-0" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/art/butterfly-dots.webp" alt="" width={1400} height={933} className="relative h-full w-full animate-drift object-contain" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 md:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {BUILDS.map(([os, note, href]) => (
            <div key={os} className={`${card} p-6`}>
              <h2 className="display text-4xl">{os}</h2>
              <p className="mt-1 text-sm text-muted">{note}</p>
              <a href={href} className={`${btn("primary", "md")} mt-6 w-full`}>Download for {os}</a>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-subtle">
          Builds are published on <a href={`${GITHUB_URL}/releases`} className="text-accent hover:underline">GitHub Releases</a>.
          On macOS, allow Kelados under System Settings → Privacy &amp; Security → Accessibility so it can type for you.
          On Linux, install <code className="font-mono">xdotool</code>. Or build it yourself: <code className="font-mono">cd desktop &amp;&amp; npm install &amp;&amp; npm run dist</code>.
        </p>

        <div className="mt-16 grid gap-10 md:grid-cols-3">
          {STEPS.map(([n, title, body]) => (
            <div key={n} className="border-t border-accent/40 pt-6">
              <span className="font-mono text-sm text-accent">{n}</span>
              <h3 className="display mt-3 text-2xl">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
            </div>
          ))}
        </div>

        <div className={`${card} mt-16 flex flex-wrap items-center gap-6 p-6`}>
          <div className="min-w-0 flex-1">
            <h2 className="display text-3xl">Settings, snippets and dictionary</h2>
            <p className="mt-2 text-sm text-muted">Change the model, mic sensitivity and cleanup rules from the tray menu → Settings. Sign in there to sync snippets with the web app.</p>
          </div>
          <Link href="/integrations/" className={btn("secondary", "md")}>Browser and Word integrations →</Link>
        </div>
      </section>
    </>
  );
}

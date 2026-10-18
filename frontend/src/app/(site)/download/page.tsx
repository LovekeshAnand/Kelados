import type { Metadata } from "next";
import Link from "next/link";
import { DownloadPanel } from "@/components/DownloadPanel";
import { Faq } from "@/components/Faq";
import { JsonLd } from "@/components/JsonLd";
import { btn, card, Kicker } from "@/components/ui";
import { appSchema, breadcrumbSchema, pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  path: "/download/",
  title: "Free Dictation App for Windows, Mac & Linux",
  social: "Kelados for Desktop – Free Voice Dictation in Any App",
  description: "Free desktop dictation app for Windows, Mac and Linux. Press Ctrl+Shift+Space, talk, and Kelados types into any app: Word, Slack, VS Code, terminals and Claude Code. Speech never leaves your computer.",
});

const FAQ = [
  ["Is the Kelados desktop app free?", "Yes. Kelados is free and open source (MIT) with no word limits, no subscription and no account. Speech is recognised on your own computer, so there is no server cost to pass on."],
  ["How do I dictate into any app on Windows?", "Install Kelados, click where you want to type in any app, press Ctrl+Shift+Space, and talk. Each phrase is typed at your cursor a moment after you pause. Press the shortcut again to stop."],
  ["Does Kelados send my voice to the cloud?", "No. The speech model runs on your computer. Audio is never uploaded, which makes it suitable for confidential work."],
  ["Does it work offline?", "After the first launch downloads the speech model (about 100 MB, once), recognition runs locally. The app loads its interface from the Kelados website, so it needs a connection to start."],
  ["Can I use Kelados with Claude Code or other terminal tools?", "Yes. Focus the terminal, press the shortcut and speak your prompt; Kelados types it in. Kelados also ships an MCP server so Claude Code can talk back."],
  ["Is Kelados a free alternative to Wispr Flow?", "Kelados covers the same core workflow (a global shortcut that turns speech into clean text in any app) for free, with recognition on your device instead of in the cloud."],
  ["Is there a Kelados app for Mac?", "Yes. Open Terminal and run: curl -fsSL https://kelados.in/install.sh | sh. It installs Kelados into Applications and opens it. The app isn't notarized by Apple yet, so the script signs it locally on your Mac, which lets it open without a warning. It works on Apple silicon and Intel Macs."],
] as const;

const SCHEMA = [
  appSchema({
    name: "Kelados Desktop",
    path: "/download/",
    description: "Free voice dictation app that types what you say into any application, with on-device speech recognition.",
    category: "ProductivityApplication",
    os: "Windows 10, Windows 11, macOS, Linux",
    features: ["Global dictation shortcut", "Types into any app", "Filler word removal and voice commands", "On-device speech recognition", "Snippets and personal dictionary"],
  }),
  breadcrumbSchema("Download", "/download/"),
];

const STEPS = [
  ["01", "Install and open", "Kelados sits in your system tray. The first launch downloads the speech model once (about a minute)."],
  ["02", "Press Ctrl+Shift+Space", "A small pill appears at the bottom of the screen; your cursor stays where it was."],
  ["03", "Talk, then pause", "Each phrase is typed where your cursor is, cleaned up, with fillers removed and snippets expanded. Press the shortcut again to stop."],
];

export default function DownloadPage() {
  return (
    <>
      {SCHEMA.map((s, i) => <JsonLd key={i} data={s} />)}
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
        <DownloadPanel />

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
      <section className="mx-auto max-w-3xl px-5 pb-16 md:px-8">
        <h2 className="display text-4xl">Questions</h2>
        <div className="mt-6"><Faq items={FAQ} /></div>
      </section>
    </>
  );
}

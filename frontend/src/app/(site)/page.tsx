import Link from "next/link";
import { HeroDemo } from "@/components/HeroDemo";
import { InstallTabs } from "@/components/InstallTabs";
import { LiveStats } from "@/components/LiveStats";
import { btn, Kicker } from "@/components/ui";
import { VOICES } from "@/lib/voices";

const FEATURES = [
  ["/dictate/", "Dictation", "Talk and get clean text. Fillers vanish, “scratch that” works, snippets expand, and nothing is uploaded."],
  ["/notes/", "Notetaker", "Live transcripts of your calls with you and the others labelled, then highlights, actions and decisions."],
  ["/studio/", "Speech studio", "Turn anything from a line to a novel into natural speech, with playback that starts instantly."],
  ["/transcribe/", "Transcribe files", "Audio and video to text and subtitles in 99 languages, or translated into English."],
  ["/projects/", "Long-form projects", "Multi-voice audiobooks and podcasts, mastered to a single file."],
  ["/voices/", `${VOICES.length} voices`, "American and British narrators, from warm storytellers to crisp presenters."],
] as const;

const APPS = [
  ["/integrations/#chrome", "Google Docs", "Chrome extension: dictate into Docs, Gmail, Notion and any text box on the web."],
  ["/integrations/#word", "Microsoft Word", "An add-in panel that writes at your cursor and reads your document aloud."],
  ["/integrations/#claude-code", "Claude Code", "Speak your prompts into the terminal, and let Claude talk back through Kelados."],
  ["/download/", "Every other app", "The desktop app types wherever your cursor is: Slack, VS Code, email, anything."],
] as const;

const STEPS = [
  ["01", "Download once", "Your device fetches compact open models (Moonshine, Whisper, Kokoro) from a public CDN and caches them."],
  ["02", "Run locally", "WebGPU, or multi-threaded WASM on older machines, runs them faster than real time."],
  ["03", "Keep it private", "Your voice and text never leave your machine. The optional account only syncs settings."],
];

const COMPARE: [string, string, string][] = [
  ["Price", "Free, forever", "Monthly subscription"],
  ["Word or minute limits", "None", "Quotas and tiers"],
  ["Where speech is processed", "Your device", "Vendor servers"],
  ["Your audio is uploaded", "Never", "Every time"],
  ["Works offline", "Yes, after first load", "No"],
  ["Source code", "Open (MIT)", "Closed"],
];

export default function Home() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <div className="dots pointer-events-none absolute inset-0" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 pb-16 pt-12 md:px-8 lg:grid-cols-[1fr_1.05fr] lg:pb-24 lg:pt-20">
          <div className="relative z-10">
            <Kicker>Open-source voice AI · runs on your device</Kicker>
            <h1 className="display mt-6 text-[clamp(4rem,11vw,9rem)]">
              Speak<br />It&apos;s <span className="text-accent">written</span>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-muted">
              Dictate into any app, take live meeting notes, and turn text into natural speech. Free, unlimited, and private,
              because it all runs on your own machine.
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              <Link href="/download/" className={btn("primary", "lg")}>
                <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden><path d="M3 5.5 10 4.5v7H3zM11 4.4 21 3v8.5H11zM3 12.5h7v7l-7-1zM11 12.5h10V21l-10-1.4z" /></svg>
                Download for desktop
              </Link>
              <Link href="/dictate/" className={btn("secondary", "lg")}>Try it in the browser</Link>
            </div>
            <div className="mt-10"><InstallTabs /></div>
          </div>

          <div className="relative aspect-[3/2] w-full">
            <div className="bloom pointer-events-none absolute inset-[-10%]" />
            <div className="dots-ramp pointer-events-none absolute inset-0 opacity-50" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/art/butterfly-dots.webp" alt="" width={1400} height={933} fetchPriority="high"
              className="relative h-full w-full animate-drift object-contain" />
          </div>
        </div>
      </section>

      <div className="overflow-hidden border-b border-line py-3">
        <p className="label flex flex-wrap justify-center gap-x-6 gap-y-1 px-5 text-sm text-muted">
          {["Dictation", "Notetaker", "Text to speech", "99 languages", "Offline", "No uploads", "MIT licensed"].map((x) => (
            <span key={x} className="flex items-center gap-6">{x}<span className="size-1 rounded-full bg-accent" /></span>
          ))}
        </p>
      </div>

      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <Kicker>Everything voice</Kicker>
        <h2 className="display mt-4 max-w-3xl text-5xl md:text-6xl">One workspace for your voice, <span className="text-accent">in and out</span></h2>
        <div className="mt-12 grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(([href, title, body], i) => (
            <Link key={href} href={href} className="group relative bg-bg p-7 transition-colors hover:bg-surface">
              <span className="font-mono text-xs text-subtle">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="display mt-6 text-3xl group-hover:text-accent">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{body}</p>
              <span className="label mt-6 inline-block text-xs text-accent opacity-0 transition-opacity group-hover:opacity-100">Open →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden border-y border-line">
        <div className="dots-ramp pointer-events-none absolute inset-0 opacity-60" />
        <div className="relative mx-auto max-w-7xl px-5 py-20 md:px-8">
          <Kicker>Integrations</Kicker>
          <h2 className="display mt-4 max-w-3xl text-5xl md:text-6xl">Talk to the tools <span className="text-accent">you already use</span></h2>
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {APPS.map(([href, title, body]) => (
              <Link key={title} href={href} className="group rounded-md border border-line bg-bg/80 p-6 backdrop-blur transition-colors hover:border-accent/50">
                <h3 className="display text-2xl group-hover:text-accent">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{body}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 md:px-8 lg:grid-cols-2">
        <div>
          <Kicker>Text to speech</Kicker>
          <h2 className="display mt-4 text-5xl md:text-6xl">Give any text <span className="text-accent">a voice</span></h2>
          <p className="mt-5 max-w-md leading-relaxed text-muted">
            {VOICES.length} natural voices generated in your browser. No credits and no character caps. Try it right here.
          </p>
          <div className="mt-10"><LiveStats /></div>
        </div>
        <HeroDemo />
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <Kicker>How it&apos;s free</Kicker>
        <h2 className="display mt-4 max-w-3xl text-5xl md:text-6xl">They charge for their GPUs. <span className="text-accent">Kelados uses yours.</span></h2>
        <div className="mt-12 grid gap-10 md:grid-cols-3">
          {STEPS.map(([n, title, body]) => (
            <div key={n} className="border-t border-accent/40 pt-6">
              <span className="font-mono text-sm text-accent">{n}</span>
              <h3 className="display mt-3 text-2xl">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
            </div>
          ))}
        </div>
        <div className="mt-16 overflow-x-auto rounded-md border border-line">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="bg-surface">
              <tr>
                <th className="p-4 font-normal text-muted" />
                <th className="label p-4 text-accent">Kelados</th>
                <th className="label p-4 font-normal text-muted">Paid voice apps</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map(([k, us, them]) => (
                <tr key={k} className="border-t border-line">
                  <td className="p-4 text-muted">{k}</td>
                  <td className="p-4"><span className="mr-2 inline-block size-1.5 rounded-full bg-accent" />{us}</td>
                  <td className="p-4 text-muted">{them}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-subtle">Compared with typical paid services. Check each vendor for current terms.</p>
      </section>

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 md:px-8 lg:grid-cols-2">
        <div>
          <Kicker>For developers</Kicker>
          <h2 className="display mt-4 text-5xl md:text-6xl">Three lines. <span className="text-accent">No invoice.</span></h2>
          <p className="mt-5 max-w-md leading-relaxed text-muted">
            Use the Node SDK, the CLI, an MCP server for AI agents, or point an existing TTS client at a server you run yourself.
          </p>
          <Link href="/developers/" className={`${btn("secondary", "md")} mt-8`}>Read the docs →</Link>
        </div>
        <pre className="overflow-x-auto rounded-md border border-line bg-surface p-6 font-mono text-[13px] leading-relaxed text-muted">
<span className="text-subtle">{"// npm install kelados"}</span>{"\n"}
<span className="text-accent">import</span> {"{ createKelados }"} <span className="text-accent">from</span> <span className="text-fg">&quot;kelados&quot;</span>;{"\n\n"}
<span className="text-accent">const</span> tts = <span className="text-accent">await</span> createKelados();{"\n"}
<span className="text-accent">const</span> clip = <span className="text-accent">await</span> tts.speak(<span className="text-fg">&quot;Hello, world&quot;</span>, {"{ voice: "}<span className="text-fg">&quot;af_heart&quot;</span>{" }"});{"\n"}
<span className="text-accent">await</span> clip.save(<span className="text-fg">&quot;hello.wav&quot;</span>);
        </pre>
      </section>

      <section className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="relative overflow-hidden rounded-md border border-accent/30 bg-surface px-6 py-20 text-center">
          <div className="dots pointer-events-none absolute inset-0" />
          <div className="bloom pointer-events-none absolute left-1/2 top-1/2 h-96 w-[48rem] -translate-x-1/2 -translate-y-1/2" />
          <h2 className="display relative text-6xl md:text-8xl">Just <span className="text-accent">say it</span></h2>
          <p className="relative mx-auto mt-5 max-w-md text-muted">No account needed. Open dictation and start talking.</p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-2">
            <Link href="/dictate/" className={btn("primary", "lg")}>Start dictating</Link>
            <Link href="/download/" className={btn("secondary", "lg")}>Get the desktop app</Link>
          </div>
        </div>
      </section>
    </>
  );
}

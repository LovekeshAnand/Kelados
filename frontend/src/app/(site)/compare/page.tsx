import type { Metadata } from "next";
import Link from "next/link";
import { Faq } from "@/components/Faq";
import { JsonLd } from "@/components/JsonLd";
import { btn, card, PageHero } from "@/components/ui";
import { breadcrumbSchema, pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  path: "/compare/",
  title: "Free Wispr Flow, Otter & ElevenLabs Alternative",
  social: "Kelados vs Wispr Flow, Otter.ai and ElevenLabs – a Free, Private Alternative",
  description: "How Kelados compares with Wispr Flow (dictation), Otter.ai (meeting notes) and ElevenLabs (text to speech): free with no usage limits, open source, and your audio stays on your device.",
});

// Competitor columns describe each product's general model (cloud processing, paid plans with usage limits),
// not prices, which change often. Each section links to the official site so readers can check current plans.
const ROWS: { vs: string; site: string; kind: string; href: string; page: string; rows: [string, string, string][]; take: string }[] = [
  {
    vs: "Wispr Flow", site: "https://wisprflow.ai", kind: "Voice dictation", href: "/download/", page: "/wispr-flow-alternative/",
    rows: [
      ["Dictate into any app with a shortcut", "Yes (Windows, Mac, Linux)", "Yes"],
      ["Filler removal and spoken corrections", "Yes, rule-based", "Yes, AI rewriting"],
      ["Where speech is processed", "On your device", "Cloud servers"],
      ["Price", "Free, no word limits", "Free tier with limits, paid plans"],
      ["Open source", "Yes (MIT)", "No"],
    ],
    take: "Pick Kelados if you want free, private dictation everywhere. Wispr Flow's AI rewriting can reformat text more heavily (for example changing tone), which Kelados deliberately doesn't do: it never invents words you didn't say.",
  },
  {
    vs: "Otter.ai", site: "https://otter.ai", kind: "Meeting notes", href: "/notes/", page: "/otter-alternative/",
    rows: [
      ["Live meeting transcript", "Yes", "Yes"],
      ["Joins your call as a bot", "No, it listens to your mic and meeting tab", "Can join as an assistant"],
      ["Summary, action items, decisions", "Yes, extracted from what was said", "Yes, AI-generated"],
      ["Where audio is processed and stored", "On your device", "Cloud servers"],
      ["Price", "Free, no minute limits", "Free tier with limits, paid plans"],
    ],
    take: "Pick Kelados for private notes with no bot in the room and no minute caps. Otter is stronger at team features such as shared workspaces and identifying many individual speakers.",
  },
  {
    vs: "ElevenLabs", site: "https://elevenlabs.io", kind: "Text to speech", href: "/studio/", page: "/elevenlabs-alternative/",
    rows: [
      ["Natural AI voices", "28 English voices (Kokoro-82M)", "Large multilingual voice library"],
      ["Character limits", "None", "Monthly character credits by plan"],
      ["Voice cloning", "No", "Yes"],
      ["Where speech is generated", "On your device", "Cloud servers"],
      ["Developer API", "Free SDK and self-hosted server", "Paid hosted API"],
    ],
    take: "Pick Kelados for unlimited English narration, audiobooks and app voices at zero cost. ElevenLabs is the better choice if you need voice cloning or many languages.",
  },
];

const FAQ = [
  ["What is the best free alternative to Wispr Flow?", "Kelados is a free, open-source alternative to Wispr Flow. It gives you a global shortcut (Ctrl+Shift+Space) that types what you say into any app on Windows, Mac and Linux, removes filler words and handles spoken corrections, and processes speech on your device instead of in the cloud."],
  ["Is there a free Otter.ai alternative that doesn't join the meeting?", "Yes. The Kelados notetaker captures your microphone and the audio of the meeting tab you share, so no bot joins your Zoom, Google Meet or Teams call. It produces a live transcript and then highlights, action items and decisions, with no minute limits."],
  ["Is there a free ElevenLabs alternative with no character limit?", "Kelados Speech Studio generates natural English speech with 28 voices and no character limits, because the Kokoro model runs in your browser. It doesn't do voice cloning."],
  ["Why is Kelados free when other voice apps charge?", "Other voice apps run AI models on their servers and charge for the compute. Kelados runs the models on your own device, so there's no per-word or per-minute cost to pass on."],
] as const;

export default function ComparePage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema("Compare", "/compare/")} />
      <PageHero kicker="Compare" title="Free, private," accent="no limits.">
        How Kelados compares with the popular paid voice tools. The short version: the same everyday workflows, free, with your
        audio staying on your device.
      </PageHero>

      <div className="mx-auto max-w-5xl space-y-14 px-5 py-14 md:px-8">
        {ROWS.map((r) => (
          <section key={r.vs} id={r.vs.toLowerCase().replace(/[^a-z]/g, "")} className="scroll-mt-20">
            <p className="label text-xs text-accent">{r.kind}</p>
            <h2 className="display mt-2 text-4xl md:text-5xl">Kelados vs {r.vs}</h2>
            <div className={`${card} mt-6 overflow-x-auto`}>
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead className="border-b border-line">
                  <tr><th className="p-4 font-normal text-muted" /><th className="label p-4 text-accent">Kelados</th><th className="label p-4 font-normal text-muted">{r.vs}</th></tr>
                </thead>
                <tbody>
                  {r.rows.map(([k, a, b]) => (
                    <tr key={k} className="border-b border-line last:border-0">
                      <th scope="row" className="p-4 font-normal text-muted">{k}</th><td className="p-4 text-fg">{a}</td><td className="p-4 text-muted">{b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-[15px] leading-relaxed text-muted">{r.take}</p>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
              <Link href={r.href} className={btn("primary", "md")}>Try Kelados {r.kind.toLowerCase()}</Link>
              <Link href={r.page} className="text-accent hover:underline">Full {r.vs} alternative guide →</Link>
              <a href={r.site} rel="nofollow noopener" className="text-subtle hover:text-fg">{r.vs} plans and features →</a>
            </div>
          </section>
        ))}

        <p className="text-xs text-subtle">Based on each product&apos;s public website in October 2026. Plans change; check their sites for current details.</p>

        <section>
          <h2 className="display text-4xl">Questions</h2>
          <div className="mt-6"><Faq items={FAQ} /></div>
        </section>
      </div>
    </>
  );
}

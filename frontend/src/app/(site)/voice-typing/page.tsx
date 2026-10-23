import type { Metadata } from "next";
import Link from "next/link";
import { Faq } from "@/components/Faq";
import { JsonLd } from "@/components/JsonLd";
import { btn, card, PageHero } from "@/components/ui";
import { VOICE_LANGUAGES } from "@/lib/languages";
import { breadcrumbSchema, pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  path: "/voice-typing/",
  title: "Free Voice Typing Online in Hindi, Tamil & 99 Languages",
  social: "Free Voice Typing in Hindi, Tamil, Marathi and 99 Languages",
  description: "Free voice typing online in English, Hinglish, Hindi, Tamil, Marathi, Telugu, Bengali and 99 languages. Speak and it types, in the browser or any app. No sign-up, nothing uploaded.",
});

const FAQ = [
  ["What is the best free voice typing tool?", "Kelados is free, open source and has no word limits. It types English, Hinglish, Hindi and 99 other languages in your browser, and its desktop app types into any app on Windows, Mac and Linux. Speech is recognised on your device, so nothing is uploaded."],
  ["Does voice typing work offline?", "Yes, after the first use. The speech model downloads once and is stored on your device, so recognition keeps working without a connection."],
  ["Can I voice type in Google Docs or Word?", "Yes. The Kelados Chrome extension types into Google Docs, Gmail and any website, and the desktop app or Word add-in types into Microsoft Word."],
] as const;

export default function VoiceTypingHub() {
  return (
    <>
      <JsonLd data={breadcrumbSchema("Voice typing", "/voice-typing/")} />
      <PageHero kicker="Voice typing" title="Type with your voice," accent="in your language.">
        Free voice typing online. Speak English, Hinglish, Hindi, Tamil, Marathi, Telugu, Bengali, Punjabi, Urdu or 90+ more
        languages and the words appear. No sign-up, no limits, and your audio never leaves your device.
      </PageHero>
      <div className="mx-auto max-w-5xl space-y-14 px-5 py-14 md:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/dictate/" className={`${card} group p-6 transition-colors hover:border-accent/50`}>
            <p className="display text-3xl group-hover:text-accent">English</p>
            <p className="mt-2 text-sm text-muted">Live, with punctuation and voice commands</p>
          </Link>
          {VOICE_LANGUAGES.map((l) => (
            <Link key={l.slug} href={`/voice-typing/${l.slug}/`} className={`${card} group p-6 transition-colors hover:border-accent/50`}>
              <p className="display text-3xl group-hover:text-accent">{l.name}</p>
              <p dir="auto" className="mt-2 text-sm text-muted">{l.native}{l.slug === "hindi" && " · and Hinglish"}</p>
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dictate/" className={btn("primary", "lg")}>Start voice typing</Link>
          <Link href="/download/" className={btn("secondary", "lg")}>Voice type in any app</Link>
        </div>
        <section>
          <h2 className="display text-4xl">Questions</h2>
          <div className="mt-6"><Faq items={FAQ} /></div>
        </section>
      </div>
    </>
  );
}

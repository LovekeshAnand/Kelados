import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Faq } from "@/components/Faq";
import { JsonLd } from "@/components/JsonLd";
import { btn, card, Kicker, PageHero } from "@/components/ui";
import { VOICE_LANGUAGES, voiceLanguage } from "@/lib/languages";
import { appSchema, breadcrumbSchema, pageMeta } from "@/lib/seo";

export const dynamicParams = false;
export const generateStaticParams = () => VOICE_LANGUAGES.map((l) => ({ lang: l.slug }));

export async function generateMetadata({ params }: PageProps<"/voice-typing/[lang]">): Promise<Metadata> {
  const l = voiceLanguage((await params).lang)!;
  return pageMeta({
    path: `/voice-typing/${l.slug}/`,
    title: `Free ${l.name} Voice Typing Online – ${l.native} Speech to Text`,
    social: `${l.name} Voice Typing – Free, Private, No Sign-up`,
    description: `Type in ${l.name} with your voice, free. Speak and ${l.native} text appears, in your browser or any app on your PC. No sign-up, no limits, audio never uploaded.`,
  });
}

export default async function LanguagePage({ params }: PageProps<"/voice-typing/[lang]">) {
  const l = voiceLanguage((await params).lang);
  if (!l) notFound();
  const path = `/voice-typing/${l.slug}/`;
  const start = `/dictate/?lang=${l.code}`;

  const steps = [
    ["01", "Open dictation", `Click “Start ${l.name} voice typing”. ${l.name} is selected for you and the speech model downloads once.`],
    ["02", "Allow the microphone", "Your browser asks once. Audio stays on your device: nothing is recorded on a server."],
    ["03", "Speak, then pause", `${l.native} text appears after each pause. Copy it, or send it to WhatsApp, email or a document.`],
  ];
  const faq: [string, string][] = [
    [`How do I type in ${l.name} with my voice for free?`, `Open Kelados ${l.name} voice typing, allow the microphone and speak. ${l.name} text in ${l.native} script appears after each pause. It is free, needs no account and has no word limit.`],
    [`Does ${l.name} voice typing work on PC?`, `Yes. It works in Chrome, Edge and other modern browsers on Windows, Mac and Linux. For typing into any app (Word, WhatsApp Web, Gmail), install the free Kelados desktop app and press Ctrl+Shift+Space.`],
    ["Is my voice uploaded?", "No. The speech model runs inside your browser or the desktop app, so your audio never leaves your device. It also works offline once the model has downloaded."],
    [`Which engine recognises ${l.name}?`, l.engine],
    ...(l.faq ?? []),
  ];

  return (
    <>
      <JsonLd data={appSchema({
        name: `Kelados ${l.name} Voice Typing`, path,
        description: `Free ${l.name} voice typing and speech to text that runs on your device.`,
        category: "ProductivityApplication", os: "Web browser, Windows, macOS, Linux",
        features: [`${l.name} speech to text in ${l.native} script`, "No sign-up or word limits", "On-device recognition, nothing uploaded", "Desktop app types into any app"],
      })} />
      <JsonLd data={breadcrumbSchema(`${l.name} voice typing`, path)} />

      <PageHero kicker={`${l.name} voice typing`} title={`Speak ${l.name}.`} accent="It types.">
        Free {l.name} voice typing online: speak and {l.native} text appears, in your browser or in any app on your computer.
        No sign-up, no limits, and your voice never leaves your device.
      </PageHero>

      <div className="mx-auto max-w-5xl space-y-16 px-5 py-14 md:px-8">
        <div className={`${card} p-6 md:p-8`}>
          <p className="label text-xs text-accent">You say</p>
          <p dir="auto" className="mt-2 text-2xl leading-relaxed md:text-3xl">{l.sample[0]}</p>
          <p className="mt-2 text-sm text-muted">“{l.sample[1]}”</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href={start} className={btn("primary", "lg")}>Start {l.name} voice typing</Link>
            <Link href="/download/" className={btn("secondary", "lg")}>Type {l.name} in any app</Link>
          </div>
        </div>

        <section>
          <Kicker>How it works</Kicker>
          <div className="mt-6 grid gap-10 md:grid-cols-3">
            {steps.map(([n, title, body]) => (
              <div key={n} className="border-t border-accent/40 pt-6">
                <span className="font-mono text-sm text-accent">{n}</span>
                <h2 className="display mt-3 text-2xl">{title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="display text-4xl">Questions</h2>
          <div className="mt-6"><Faq items={faq} /></div>
        </section>

        <section>
          <h2 className="display text-3xl">Voice typing in other languages</h2>
          <p className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {VOICE_LANGUAGES.filter((o) => o.slug !== l.slug).map((o) => (
              <Link key={o.slug} href={`/voice-typing/${o.slug}/`} className="text-accent hover:underline">{o.name} · {o.native}</Link>
            ))}
            <Link href="/voice-typing/" className="text-muted hover:text-fg">All languages →</Link>
          </p>
        </section>
      </div>
    </>
  );
}

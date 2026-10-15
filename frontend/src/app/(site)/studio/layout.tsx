import type { Metadata } from "next";
import { Faq } from "@/components/Faq";
import { JsonLd } from "@/components/JsonLd";
import { appSchema, breadcrumbSchema, pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  path: "/studio/",
  title: "Free Unlimited Text to Speech, 28 AI Voices",
  social: "Kelados Speech Studio – Free, Unlimited Text to Speech",
  description: "Free text to speech with 28 natural AI voices and no character limits. Playback starts while the rest generates. Runs entirely in your browser; export WAV. No sign-up.",
});

const FAQ = [
  [
    "Is there a free text to speech with no character limit?",
    "Yes. Kelados Speech Studio has no character, word or daily limits, because the Kokoro voice model runs on your own device instead of a paid server."
  ],
  [
    "Can I download the audio?",
    "Yes. Every generation can be exported as a WAV file, and the latest 50 are kept in your browser's history."
  ],
  [
    "Can I use Kelados voices commercially?",
    "Yes. The Kokoro-82M model is Apache-2.0 licensed and Kelados is MIT licensed, so the audio you generate is yours to use, including commercially."
  ],
  [
    "How natural do the voices sound?",
    "Kelados uses Kokoro-82M, which ranked first on the community TTS Arena at launch despite its small size. It has 28 American and British English voices."
  ]
] as const;

const SCHEMA = [
  appSchema({
    "name": "Kelados Speech Studio",
    "path": "/studio/",
    "description": "Free text to speech with 28 natural AI voices and no character limits. Playback starts while the rest generates. Runs entirely in your browser; export WAV. No sign-up.",
    "category": "MultimediaApplication",
    "os": "Web browser",
    "features": [
      "28 natural English voices",
      "No character or usage limits",
      "Streaming playback",
      "Speed control",
      "WAV export",
      "Runs in the browser, nothing uploaded"
    ]
  }),
  breadcrumbSchema("Speech Studio", "/studio/"),
];

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {SCHEMA.map((s, i) => <JsonLd key={i} data={s} />)}
      {children}
      <section className="mx-auto max-w-3xl px-5 pb-8 pt-12 md:px-8">
        <h2 className="display text-4xl">Questions</h2>
        <div className="mt-6"><Faq items={FAQ} /></div>
      </section>
    </>
  );
}

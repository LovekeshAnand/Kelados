import type { Metadata } from "next";
import { Faq } from "@/components/Faq";
import { JsonLd } from "@/components/JsonLd";
import { appSchema, breadcrumbSchema, pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  path: "/dictate/",
  title: "Free Voice Dictation – Speak and It Writes",
  social: "Kelados Dictation – Free, Private Speech to Text",
  description: "Free voice dictation that turns speech into clean, punctuated text in real time. Removes filler words, understands “scratch that” and corrections, expands snippets. Runs privately on your device.",
});

const FAQ = [
  [
    "How do I dictate text for free?",
    "Open Kelados Dictation, tap the microphone and talk. Text appears a moment after each pause, punctuated and with filler words removed. It's free with no word limits and needs no account."
  ],
  [
    "Is Kelados dictation private?",
    "Yes. Speech is recognised by a model running in your browser (Moonshine or Whisper), so your voice is never uploaded. The model downloads once and stays on your device."
  ],
  [
    "What voice commands can I use?",
    "Say “new line” or “new paragraph” for breaks, “bullet point” for a list item, “comma”, “period” or “question mark” for punctuation, and “scratch that” to delete the last phrase. Corrections like “4pm, no wait, 5pm” keep only the correction."
  ],
  [
    "Can I dictate into other apps, not just this page?",
    "Yes. The free desktop app types into any app with Ctrl+Shift+Space, and the Chrome extension dictates into Google Docs, Gmail and any website."
  ]
] as const;

const SCHEMA = [
  appSchema({
    "name": "Kelados Dictation",
    "path": "/dictate/",
    "description": "Free voice dictation that turns speech into clean, punctuated text in real time. Removes filler words, understands “scratch that” and corrections, expands snippets. Runs privately on your device.",
    "category": "ProductivityApplication",
    "os": "Web browser, Windows, Linux",
    "features": [
      "Real-time speech to text",
      "Filler word removal",
      "Voice commands for punctuation and formatting",
      "Self-corrections and “scratch that”",
      "Snippets and personal dictionary",
      "On-device speech recognition, nothing uploaded"
    ]
  }),
  breadcrumbSchema("Dictation", "/dictate/"),
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

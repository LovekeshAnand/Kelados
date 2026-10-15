import type { Metadata } from "next";
import { Faq } from "@/components/Faq";
import { JsonLd } from "@/components/JsonLd";
import { appSchema, breadcrumbSchema, pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  path: "/notes/",
  title: "Free AI Meeting Notetaker – No Bot Joins",
  social: "Kelados Notetaker – Free AI Meeting Notes, No Bot",
  description: "Free AI meeting notetaker for Google Meet, Zoom and Teams. Live transcripts with you and others labelled, then highlights, action items and decisions. No bot joins your call and no audio is uploaded.",
});

const FAQ = [
  [
    "How do I transcribe a Zoom, Google Meet or Teams call for free?",
    "Open Kelados Notes, choose Meeting transcript and press Start recording. In Chrome's share dialog pick the meeting tab and turn on “Also share tab audio”. Your words are labelled You and everyone else Others, live."
  ],
  [
    "Does a bot join my meeting?",
    "No. Kelados listens to your microphone and the meeting tab you share, so nothing joins the call and other participants see no extra attendee."
  ],
  [
    "What do I get after the meeting?",
    "Highlights, action items, decisions and open questions extracted from what was actually said (nothing is invented), plus the full timestamped transcript. Export as Markdown, TXT or SRT subtitles."
  ],
  [
    "Where are my notes stored?",
    "In your browser's local storage on your device. Audio and transcripts are never uploaded."
  ]
] as const;

const SCHEMA = [
  appSchema({
    "name": "Kelados Notetaker",
    "path": "/notes/",
    "description": "Free AI meeting notetaker for Google Meet, Zoom and Teams. Live transcripts with you and others labelled, then highlights, action items and decisions. No bot joins your call and no audio is uploaded.",
    "category": "BusinessApplication",
    "os": "Web browser",
    "features": [
      "Live meeting transcription",
      "Speaker labels for you and other participants",
      "Highlights, action items, decisions and open questions",
      "Dictated personal notes",
      "Export to Markdown, TXT and SRT",
      "No meeting bot, audio stays on your device"
    ]
  }),
  breadcrumbSchema("Notetaker", "/notes/"),
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

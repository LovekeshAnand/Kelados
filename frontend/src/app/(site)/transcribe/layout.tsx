import type { Metadata } from "next";
import { Faq } from "@/components/Faq";
import { JsonLd } from "@/components/JsonLd";
import { appSchema, breadcrumbSchema, pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  path: "/transcribe/",
  title: "Free Audio & Video Transcription, 99 Languages",
  social: "Kelados – Free Speech to Text & Subtitles",
  description: "Free audio and video transcription in 99 languages with SRT and VTT subtitle export, or translate to English. Whisper runs in your browser, so files are never uploaded.",
});

const FAQ = [
  [
    "How do I transcribe an audio or video file for free?",
    "Drop an MP3, WAV, M4A, OGG, WebM or MP4 file onto Kelados Transcribe and press Transcribe. Results stream in as each section finishes. There's no length limit and no account."
  ],
  [
    "Can I make subtitles from a video?",
    "Yes. Kelados exports SRT and VTT subtitle files with timestamps, ready for YouTube, Premiere or VLC."
  ],
  [
    "Which languages are supported?",
    "Whisper supports 99 languages and can also translate speech from any of them into English."
  ],
  [
    "Are my files uploaded?",
    "No. Whisper runs in your browser, so the file never leaves your device. That also means it works offline once the model is downloaded."
  ]
] as const;

const SCHEMA = [
  appSchema({
    "name": "Kelados Transcribe",
    "path": "/transcribe/",
    "description": "Free audio and video transcription in 99 languages with SRT and VTT subtitle export, or translate to English. Whisper runs in your browser, so files are never uploaded.",
    "category": "MultimediaApplication",
    "os": "Web browser",
    "features": [
      "Transcription in 99 languages",
      "Translation to English",
      "SRT and VTT subtitles",
      "Any file length",
      "Files never leave your device"
    ]
  }),
  breadcrumbSchema("Transcribe", "/transcribe/"),
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

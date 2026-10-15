import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free Speech to Text & Subtitles – 99 Languages",
  description: "Whisper running in your browser: transcripts, SRT and VTT subtitle export in 99 languages. Nothing is uploaded. Works offline after first load.",
  openGraph: {
    title: "Kelados – Free Speech to Text & Subtitles",
    description: "Whisper in your browser. 99 languages, SRT/VTT export. Nothing uploaded.",
    url: "/transcribe/",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

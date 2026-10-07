import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free speech to text & subtitles",
  description: "Whisper in your browser: transcripts, SRT and VTT subtitles in 99 languages. Nothing uploaded.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Speech Studio – Free Unlimited Text-to-Speech",
  description: "Turn any text into natural AI speech with 28 voices. Unlimited characters, runs entirely in your browser — nothing is uploaded. Export WAV.",
  openGraph: {
    title: "Kelados Speech Studio – Free, Unlimited TTS",
    description: "28 AI voices. No character limits. Runs in your browser. Export WAV.",
    url: "/studio/",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

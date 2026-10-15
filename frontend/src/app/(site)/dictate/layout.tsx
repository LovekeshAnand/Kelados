import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free Voice Dictation – Speak and It Writes",
  description: "Talk and get clean, punctuated text in real time. Removes filler words, understands “scratch that”, expands snippets. Runs privately in your browser.",
  openGraph: { title: "Kelados Dictation – Speak and It Writes", url: "/dictate/" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

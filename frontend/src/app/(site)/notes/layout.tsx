import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free AI Notetaker – Live Meeting Transcripts and Summaries",
  description: "Live transcripts of Meet, Zoom and Teams calls with speakers labelled, then highlights, action items and decisions. No bot joins, no audio is uploaded.",
  openGraph: { title: "Kelados Notetaker", url: "/notes/" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

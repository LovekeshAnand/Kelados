import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projects: multi-voice audiobooks & podcasts",
  description: "Cast a voice per line, set pauses and export a mastered WAV, free.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

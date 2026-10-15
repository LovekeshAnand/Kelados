import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbSchema, pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  path: "/projects/",
  title: "Free Multi-Voice Audiobook & Podcast Maker",
  social: "Kelados Projects – Free Multi-Voice Audiobooks & Podcasts",
  description: "Turn a script into a multi-voice audiobook, podcast or voiceover: a voice and pause per block, exported as one WAV. Free, unlimited length.",
});

const SCHEMA = [
  breadcrumbSchema("Projects", "/projects/"),
];

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{SCHEMA.map((s, i) => <JsonLd key={i} data={s} />)}{children}</>;
}

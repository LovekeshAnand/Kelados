import type { MetadataRoute } from "next";
import { ALTERNATIVES } from "@/lib/alternatives";
import { VOICE_LANGUAGES } from "@/lib/languages";
import { SITE } from "@/lib/seo";

export const dynamic = "force-static";

const PAGES: [path: string, priority: number, freq: "weekly" | "monthly"][] = [
  ["/", 1, "weekly"],
  ["/dictate/", 0.9, "weekly"],
  ["/notes/", 0.9, "weekly"],
  ["/download/", 0.9, "weekly"],
  ["/studio/", 0.9, "monthly"],
  ["/transcribe/", 0.8, "monthly"],
  ["/integrations/", 0.8, "monthly"],
  ["/compare/", 0.8, "monthly"],
  ["/voices/", 0.7, "monthly"],
  ["/developers/", 0.7, "monthly"],
  ["/projects/", 0.5, "monthly"],
  ["/voice-typing/", 0.8, "monthly"],
  ...VOICE_LANGUAGES.map((l): [string, number, "monthly"] => [`/voice-typing/${l.slug}/`, 0.8, "monthly"]),
  ...ALTERNATIVES.map((a): [string, number, "monthly"] => [`/${a.slug}/`, 0.9, "monthly"]),
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(); // build time = deploy time
  return PAGES.map(([path, priority, changeFrequency]) => ({ url: SITE + path, lastModified, changeFrequency, priority }));
}

import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbSchema, pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  path: "/voices/",
  title: "28 Free AI Voices – Voice Library",
  social: "Kelados Voice Library – 28 Free AI Voices",
  description: "Browse and preview 28 free AI voices: American and British English narrators, female and male. Powered by Kokoro-82M, generated on your device. Free for commercial use.",
});

const SCHEMA = [
  breadcrumbSchema("Voice Library", "/voices/"),
];

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{SCHEMA.map((s, i) => <JsonLd key={i} data={s} />)}{children}</>;
}

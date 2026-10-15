import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { appSchema, breadcrumbSchema, pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  path: "/developers/",
  title: "Free Text to Speech API, SDK & CLI",
  social: "Kelados for Developers – Free TTS SDK, CLI & API",
  description: "npm install kelados: a free Node.js text-to-speech SDK, CLI and drop-in self-hosted TTS API server, plus an MCP server for Claude Code. No per-character billing. MIT licensed.",
});

const SCHEMA = [
  appSchema({
    "name": "Kelados SDK",
    "path": "/developers/",
    "description": "npm install kelados: a free Node.js text-to-speech SDK, CLI and drop-in self-hosted TTS API server, plus an MCP server for Claude Code. No per-character billing. MIT licensed.",
    "category": "DeveloperApplication",
    "os": "Node.js 18+ on Windows, macOS, Linux",
    "features": [
      "Node.js SDK",
      "Command-line text to speech",
      "Self-hosted HTTP TTS server compatible with common TTS APIs",
      "MCP server for Claude Code and AI agents",
      "Runs locally, no API costs"
    ]
  }),
  breadcrumbSchema("Developers", "/developers/"),
];

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{SCHEMA.map((s, i) => <JsonLd key={i} data={s} />)}{children}</>;
}

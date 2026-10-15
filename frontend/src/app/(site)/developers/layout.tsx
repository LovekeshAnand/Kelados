import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Developers – Free TTS SDK, CLI & Self-Hosted API",
  description: "npm install kelados. Node SDK, CLI, and a drop-in compatible local TTS server. No API key needed for synthesis. MIT licensed.",
  openGraph: {
    title: "Kelados Developer Docs – Free TTS SDK & API",
    description: "npm install kelados. Node SDK, CLI, and a self-hosted TTS server. MIT licensed.",
    url: "/developers/",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

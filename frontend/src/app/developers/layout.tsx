import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Developers: free TTS SDK, CLI and drop-in compatible server",
  description: "npm i kelados, or self-host a drop-in compatible TTS API for /usr/bin/bash.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

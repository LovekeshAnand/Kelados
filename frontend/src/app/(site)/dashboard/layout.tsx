import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Console",
  robots: { index: false, follow: true },
  description: "Your Kelados usage, API keys, presets and pronunciation rules.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

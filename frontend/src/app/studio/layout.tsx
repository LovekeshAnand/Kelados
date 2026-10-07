import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Speech Studio: free unlimited text-to-speech",
  description: "Turn any text into natural speech with 28 AI voices. Unlimited, private, runs in your browser.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

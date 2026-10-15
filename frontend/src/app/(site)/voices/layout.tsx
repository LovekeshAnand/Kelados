import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Voice Library – 28 Free AI Voices",
  description: "Browse and preview 28 free AI voices — American and British English narrators. Powered by Kokoro, runs entirely in your browser.",
  openGraph: {
    title: "Kelados Voice Library – 28 Free AI Voices",
    description: "American and British narrators previewed live in your browser. No sign-up.",
    url: "/voices/",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

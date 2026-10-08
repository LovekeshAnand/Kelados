import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { AuthProvider } from "@/lib/api";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const bebas = Bebas_Neue({ variable: "--font-bebas", subsets: ["latin"], weight: "400" });
const instrument = Instrument_Serif({ variable: "--font-instrument", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://kelados.lovekeshanand6.workers.dev"),
  title: { default: "Kelados – Free, Unlimited Text-to-Speech", template: "%s · Kelados" },
  description:
    "Natural AI voices that run in your browser. No credits, no limits, no sign-up required. Open source TTS powered by Kokoro, with an SDK and self-hosted server for developers.",
  keywords: ["text to speech", "free tts", "ai voice generator", "open source tts", "kokoro tts", "audiobook maker", "browser tts", "offline tts", "tts sdk"],
  authors: [{ name: "Kelados" }],
  creator: "Kelados",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Kelados – Every Voice, Free Forever",
    description: "Unlimited AI text-to-speech that runs on your own device. No credits, no limits, no uploads.",
    type: "website",
    url: "https://kelados.lovekeshanand6.workers.dev",
    siteName: "Kelados",
    images: [{ url: "/og-image.png", width: 2048, height: 1236, alt: "Kelados – Free, Unlimited Text-to-Speech" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kelados – Free, Unlimited Text-to-Speech",
    description: "Natural AI voices in your browser. No credits, no limits, open source.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = { themeColor: "#0a0a0b" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} ${instrument.variable} ${bebas.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <AuthProvider>
          <Nav />
          <main className="flex-1">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}

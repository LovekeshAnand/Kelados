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
  title: { default: "Kelados: free, unlimited, open-source text-to-speech", template: "%s · Kelados" },
  description:
    "Natural AI voices that run in your browser. No credits, no limits, no sign-up. Open source, with an SDK and a drop-in compatible server for your own projects.",
  keywords: ["text to speech", "free tts", "ai voice generator", "open source tts", "kokoro", "audiobook maker"],
  openGraph: { title: "Kelados: every voice, free forever", description: "Unlimited AI text-to-speech that runs on your own device.", type: "website" },
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

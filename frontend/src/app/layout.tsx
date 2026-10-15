import type { Metadata, Viewport } from "next";
import { Antonio, Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { JsonLd } from "@/components/JsonLd";
import { AuthProvider } from "@/lib/api";
import { GITHUB, NPM, SITE } from "@/lib/seo";
import "./globals.css";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID;

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const antonio = Antonio({ variable: "--font-antonio", subsets: ["latin"] });

const SITE_SCHEMA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE}/#org`,
      name: "Kelados",
      url: SITE,
      logo: `${SITE}/logo.png`,
      description: "Open-source voice AI that runs on your own device: dictation, meeting notes, transcription and text-to-speech.",
      sameAs: [GITHUB, NPM],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE}/#site`,
      name: "Kelados",
      alternateName: ["Kelados voice AI", "κέλαδος"],
      url: SITE,
      inLanguage: "en",
      publisher: { "@id": `${SITE}/#org` },
    },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  applicationName: "Kelados",
  category: "productivity",
  // Search Console / Bing Webmaster verification, set at build time when you register the site.
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
    other: process.env.NEXT_PUBLIC_BING_VERIFICATION ? { "msvalidate.01": process.env.NEXT_PUBLIC_BING_VERIFICATION } : undefined,
  },
  title: { default: "Kelados – Free Voice AI: Dictation, Notes and Text-to-Speech", template: "%s · Kelados" },
  description:
    "Speak to write anywhere, take live meeting notes, and turn text into natural speech. Voice AI that runs on your own device: free, unlimited, private and open source.",
  keywords: [
    "voice dictation", "speech to text", "free dictation software", "ai notetaker", "meeting transcription", "text to speech",
    "free tts", "unlimited text to speech", "whisper", "moonshine", "kokoro tts", "wispr flow alternative", "otter alternative",
    "elevenlabs alternative", "open source dictation", "offline dictation", "private speech to text", "dictation for claude code",
  ],
  authors: [{ name: "Kelados" }],
  creator: "Kelados",
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  openGraph: {
    title: "Kelados – Speak. It's Written.",
    description: "Free voice dictation, live meeting notes and natural text-to-speech that run on your own device. No limits, no uploads.",
    type: "website",
    url: "https://kelados.in",
    siteName: "Kelados",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Kelados – speak, it's written" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kelados – Speak. It's Written.",
    description: "Free, private voice dictation, notetaking and text-to-speech. Open source.",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = { themeColor: "#050405" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} ${antonio.variable}`}>
      <head>
        {/* Model weights and the ML runtime come from these; open the connections before the first click. */}
        <link rel="preconnect" href="https://huggingface.co" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cas-bridge.xethub.hf.co" />
        <link rel="alternate" type="text/plain" href="/llms.txt" title="LLM-readable summary" />
        <JsonLd data={SITE_SCHEMA} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <AuthProvider>{children}</AuthProvider>

        {/* Google Analytics — only injected when NEXT_PUBLIC_GA_ID is set */}
        {GA_ID && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
            <Script id="ga-init" strategy="afterInteractive">{`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_ID}');
            `}</Script>
          </>
        )}

        {/* Microsoft Clarity — only injected when NEXT_PUBLIC_CLARITY_ID is set */}
        {CLARITY_ID && (
          <Script id="clarity-init" strategy="afterInteractive">{`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window,document,"clarity","script","${CLARITY_ID}");
          `}</Script>
        )}
      </body>
    </html>
  );
}

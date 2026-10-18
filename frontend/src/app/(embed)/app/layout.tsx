import type { Metadata } from "next";
import { Instrument_Serif, Manrope } from "next/font/google";

// The app's own type: Manrope for the interface, a serif only for banner headlines. Loaded here, not on the website.
const sans = Manrope({ variable: "--font-app", subsets: ["latin"] });
const serif = Instrument_Serif({ variable: "--font-serif", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });

export const metadata: Metadata = { title: { absolute: "Kelados" } };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${sans.variable} ${serif.variable}`}>{children}</div>;
}

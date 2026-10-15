import type { Metadata } from "next";

// Bare pages hosted inside other apps: the desktop overlay, the Chrome extension popup and the Word task pane.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return <main className="flex-1">{children}</main>;
}

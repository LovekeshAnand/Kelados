import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Voice library",
  description: "28 free AI voices, American and British, previewed live on your device.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

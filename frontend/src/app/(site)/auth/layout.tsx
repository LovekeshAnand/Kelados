import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: true },
  description: "Sign in or create a free Kelados account.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

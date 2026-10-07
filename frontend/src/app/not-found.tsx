import Link from "next/link";
import { btn } from "@/components/ui";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-md px-5 py-32 text-center">
      <p className="font-mono text-sm text-accent">404</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 text-muted">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      <Link href="/" className={`${btn("primary")} mt-8`}>Back home</Link>
    </section>
  );
}

import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { btn } from "@/components/ui";

export default function NotFound() {
  return (
    <>
      <Nav />
      <main className="relative flex-1 overflow-hidden">
        <div className="dots pointer-events-none absolute inset-0" />
        <section className="relative mx-auto max-w-md px-5 py-32 text-center">
          <p className="display text-[8rem] text-accent">404</p>
          <h1 className="display mt-2 text-4xl">Nothing to hear here</h1>
          <p className="mt-3 text-muted">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
          <Link href="/" className={`${btn("primary")} mt-8`}>Back home</Link>
        </section>
      </main>
      <Footer />
    </>
  );
}

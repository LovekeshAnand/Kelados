"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/api";
import { btn } from "./ui";

const LINKS = [
  ["/studio/", "Studio"],
  ["/projects/", "Projects"],
  ["/voices/", "Voices"],
  ["/transcribe/", "Transcribe"],
  ["/developers/", "Developers"],
] as const;

/** The Kelados mark: three interlocking hexagons, traced from public/logo.png. */
export function Mark({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="70 60 680 680" className={className} fill="none" stroke="currentColor" strokeWidth="44" strokeLinejoin="miter" aria-hidden>
      <path d="M178 80h177l88 153-88 153H178L90 233z" />
      <path d="M178 412h174l89 154-89 154H178L90 566z" />
      <path d="M467 247h174l90 154-90 152H467l-88-152z" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="Kelados home">
      <Mark />
      <span className="font-brand text-2xl leading-none tracking-wide">KELADOS</span>
    </Link>
  );
}

export function Nav() {
  const path = usePathname();
  const { user, ready } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-line bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-5 md:px-8">
        <div className="flex items-center gap-8">
          <Logo />
          <div className="hidden items-center gap-1 lg:flex">
            {LINKS.map(([href, label]) => (
              <Link key={href} href={href}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${path.startsWith(href) ? "bg-elevated text-fg" : "text-muted hover:text-fg"}`}>
                {label}
              </Link>
            ))}
          </div>
        </div>
        <div className="hidden items-center gap-2 lg:flex">
          {ready && (user
            ? <Link href="/dashboard/" className={btn("secondary", "sm")}>Console</Link>
            : <>
                <Link href="/auth/" className={btn("ghost", "sm")}>Sign in</Link>
                <Link href="/studio/" className={btn("primary", "sm")}>Open studio</Link>
              </>)}
        </div>
        <button className={`${btn("secondary", "sm")} lg:hidden`} onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Menu">
          {open ? "Close" : "Menu"}
        </button>
      </div>
      {open && (
        <div className="grid gap-1 border-t border-line p-4 lg:hidden" onClick={() => setOpen(false)}>
          {LINKS.map(([href, label]) => (
            <Link key={href} href={href} className="rounded-md px-3 py-2 text-[15px] hover:bg-elevated">{label}</Link>
          ))}
          <Link href={user ? "/dashboard/" : "/auth/"} className="rounded-md px-3 py-2 text-[15px] text-accent hover:bg-elevated">
            {user ? "Console" : "Sign in"}
          </Link>
        </div>
      )}
    </nav>
  );
}

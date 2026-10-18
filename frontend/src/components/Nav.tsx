"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/api";
import { Wordmark } from "./Wordmark";

const LEFT = [
  ["/dictate/", "Dictate"],
  ["/notes/", "Notes"],
  ["/studio/", "Studio"],
  ["/transcribe/", "Transcribe"],
] as const;
const RIGHT = [
  ["/voices/", "Voices"],
  ["/integrations/", "Integrations"],
  ["/developers/", "Developers"],
] as const;

export function Logo() {
  return (
    <Link href="/" className="block text-fg transition-colors hover:text-accent" aria-label="Kelados home">
      <Wordmark className="h-6 md:h-7" />
    </Link>
  );
}

function NavLink({ href, label, path }: { href: string; label: string; path: string }) {
  const on = path.startsWith(href);
  return (
    <Link href={href} className={`relative py-1 text-sm font-medium transition-colors ${on ? "text-accent" : "text-muted hover:text-fg"}`}>
      {label}
      {on && <span className="absolute -bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-accent" />}
    </Link>
  );
}

export function Nav() {
  const path = usePathname();
  const { user, ready } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-line bg-bg/85 backdrop-blur-xl">
      <div className="mx-auto grid h-16 max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-6 px-5 md:px-8">
        <div className="hidden items-center gap-7 lg:flex">
          {LEFT.map(([href, label]) => <NavLink key={href} href={href} label={label} path={path} />)}
        </div>
        <div className="max-lg:col-start-1 max-lg:justify-self-start"><Logo /></div>
        <div className="hidden items-center justify-end gap-7 lg:flex">
          {RIGHT.map(([href, label]) => <NavLink key={href} href={href} label={label} path={path} />)}
          {ready && (user
            ? <Link href="/dashboard/" className="rounded-sm border border-accent/40 px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent-soft">Console</Link>
            : <Link href="/auth/" className="text-sm font-medium text-muted hover:text-fg">Sign in</Link>)}
          <Link href="/download/" className="rounded-sm bg-accent px-3.5 py-1.5 text-sm font-semibold text-bg transition-colors hover:bg-fg">Download</Link>
        </div>
        <button className="col-start-3 justify-self-end rounded-sm border border-accent/40 px-3 py-1.5 text-sm font-medium text-accent lg:hidden" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Menu">
          {open ? "Close" : "Menu"}
        </button>
      </div>
      {open && (
        <div className="grid gap-1 border-t border-line p-4 lg:hidden" onClick={() => setOpen(false)}>
          {[...LEFT, ...RIGHT, ["/download/", "Download app"]].map(([href, label]) => (
            <Link key={href} href={href} className="rounded-sm px-3 py-2 text-[15px] font-medium hover:bg-elevated">{label}</Link>
          ))}
          <Link href={user ? "/dashboard/" : "/auth/"} className="rounded-sm px-3 py-2 text-[15px] font-medium text-accent hover:bg-elevated">
            {user ? "Console" : "Sign in"}
          </Link>
        </div>
      )}
    </nav>
  );
}

import type { ReactNode } from "react";

const BTN = {
  primary: "bg-accent text-bg hover:bg-fg",
  accent: "bg-accent-strong text-fg hover:brightness-110",
  secondary: "border border-accent/40 bg-accent-soft text-accent hover:border-accent hover:bg-accent/15",
  ghost: "text-muted hover:bg-elevated hover:text-fg",
  danger: "border border-danger/40 text-danger hover:bg-danger/10",
} as const;

export const btn = (variant: keyof typeof BTN = "primary", size: "sm" | "md" | "lg" = "md") =>
  `${BTN[variant]} label inline-flex items-center justify-center gap-2 rounded-sm transition-colors disabled:pointer-events-none disabled:opacity-40 ${
    size === "sm" ? "h-8 px-3 text-xs" : size === "lg" ? "h-12 px-6 text-base" : "h-10 px-4 text-sm"
  }`;

export const input =
  "w-full rounded-sm border border-line bg-surface px-3.5 py-2.5 text-sm text-fg placeholder:text-subtle transition-colors focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20";

export const card = "rounded-md border border-line bg-surface";

export function Badge({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "accent" | "ok" }) {
  const t = { muted: "border-line text-muted", accent: "border-accent/30 bg-accent-soft text-accent", ok: "border-ok/30 text-ok" }[tone];
  return <span className={`label inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[11px] ${t}`}>{children}</span>;
}

export function Kicker({ children }: { children: ReactNode }) {
  return <p className="label flex items-center gap-2 text-xs text-accent"><span className="size-1.5 rounded-full bg-accent" />{children}</p>;
}

export function PageHero({ kicker, title, accent, children }: { kicker: string; title: string; accent?: string; children?: ReactNode }) {
  return (
    <header className="relative overflow-hidden border-b border-line">
      <div className="dots pointer-events-none absolute inset-0" />
      <div className="dots-ramp pointer-events-none absolute -right-20 top-0 h-full w-1/2 opacity-60" />
      <div className="relative mx-auto max-w-6xl px-5 pb-12 pt-16 md:px-8">
        <Kicker>{kicker}</Kicker>
        <h1 className="display mt-4 text-5xl md:text-7xl">
          {title} {accent && <span className="text-accent">{accent}</span>}
        </h1>
        {children && <div className="mt-5 max-w-2xl text-[15px] leading-relaxed text-muted">{children}</div>}
      </div>
    </header>
  );
}

export function Spinner() {
  return <span className="inline-block size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />;
}

/** A live input-level meter made of dots, so it matches the halftone look. */
export function LevelDots({ level, active }: { level: number; active: boolean }) {
  const n = 9;
  const lit = active ? Math.min(n, Math.round(Math.sqrt(level) * n * 4)) : 0;
  return (
    <span className="inline-flex items-center gap-1" aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className={`size-1.5 rounded-full transition-colors ${i < lit ? "bg-accent" : "bg-line-strong"}`}
          style={{ transform: `scale(${i < lit ? 1 + (1 - Math.abs(i - n / 2) / n) * 0.6 : 1})` }} />
      ))}
    </span>
  );
}

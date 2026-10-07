import type { ReactNode } from "react";

const BTN = {
  primary: "bg-fg text-bg hover:bg-white",
  accent: "bg-accent text-bg hover:brightness-110",
  secondary: "border border-line-strong bg-elevated text-fg hover:bg-line",
  ghost: "text-muted hover:bg-elevated hover:text-fg",
  danger: "border border-danger/40 text-danger hover:bg-danger/10",
} as const;

export const btn = (variant: keyof typeof BTN = "primary", size: "sm" | "md" | "lg" = "md") =>
  `${BTN[variant]} inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:pointer-events-none disabled:opacity-40 ${
    size === "sm" ? "h-8 px-3 text-xs" : size === "lg" ? "h-12 px-6 text-[15px]" : "h-10 px-4 text-sm"
  }`;

export const input =
  "w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-fg placeholder:text-subtle transition-colors focus:border-line-strong focus:outline-none focus:ring-2 focus:ring-accent/30";

export const card = "rounded-2xl border border-line bg-surface";

export function Badge({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "accent" | "ok" }) {
  const t = { muted: "border-line text-muted", accent: "border-accent/30 bg-accent-soft text-accent", ok: "border-ok/30 text-ok" }[tone];
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${t}`}>{children}</span>;
}

export function PageHero({ kicker, title, accent, children }: { kicker: string; title: string; accent?: string; children?: ReactNode }) {
  return (
    <header className="relative border-b border-line">
      <div className="grid-bg pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-6xl px-5 pb-12 pt-16 md:px-8">
        <p className="text-sm font-medium text-accent">{kicker}</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
          {title} {accent && <span className="font-serif font-normal italic text-muted">{accent}</span>}
        </h1>
        {children && <div className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted">{children}</div>}
      </div>
    </header>
  );
}

export function Spinner() {
  return <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />;
}

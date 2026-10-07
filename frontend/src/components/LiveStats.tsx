"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export function LiveStats() {
  const [s, setS] = useState<{ characters: number; seconds: number; generations: number; users: number } | null>(null);
  useEffect(() => { api<NonNullable<typeof s>>("/api/stats").then(setS).catch(() => {}); }, []);

  const items = [
    ["Characters spoken", s?.characters],
    ["Minutes of audio", s && Math.round(s.seconds / 60)],
    ["Generations", s?.generations],
    ["Members", s?.users],
  ] as const;

  return (
    <dl className="grid grid-cols-2 divide-line overflow-hidden rounded-2xl border border-line lg:grid-cols-4 lg:divide-x">
      {items.map(([label, value]) => (
        <div key={label} className="border-line p-6 max-lg:border-b max-lg:odd:border-r">
          <dt className="text-sm text-muted">{label}</dt>
          <dd className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">{value == null ? "—" : value.toLocaleString()}</dd>
        </div>
      ))}
    </dl>
  );
}

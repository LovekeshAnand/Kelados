"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { GITHUB } from "@/lib/seo";

type Usage = { characters: number; seconds: number; generations: number; users: number };
type Repo = { stars: number; downloads: number };

const REPO_API = GITHUB.replace("https://github.com/", "https://api.github.com/repos/");

/** Stars and every release asset's download count (button, install scripts and the Chrome zip alike), straight from GitHub. */
async function repoStats(): Promise<Repo> {
  const [repo, releases] = await Promise.all([
    fetch(REPO_API).then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
    fetch(`${REPO_API}/releases?per_page=100`).then((r) => (r.ok ? r.json() : [])),
  ]);
  const downloads = (releases as { assets: { download_count: number }[] }[])
    .flatMap((r) => r.assets).reduce((n, a) => n + a.download_count, 0);
  return { stars: repo.stargazers_count, downloads };
}

// Each source loads on its own, so a slow or failing API never blanks the GitHub numbers (or the reverse).
export function LiveStats() {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [repo, setRepo] = useState<Repo | null>(null);
  useEffect(() => {
    api<Usage>("/api/stats").then(setUsage).catch(() => {});
    repoStats().then(setRepo).catch(() => {});
  }, []);

  const items: [string, number | null | undefined, string?][] = [
    ["GitHub stars", repo?.stars, GITHUB],
    ["Downloads", repo?.downloads, `${GITHUB}/releases`],
    ["Characters spoken", usage?.characters],
    ["Minutes of audio", usage && Math.round(usage.seconds / 60)],
    ["Generations", usage?.generations],
    ["Members", usage?.users],
  ];

  return (
    <dl className="grid grid-cols-2 overflow-hidden rounded-2xl border border-line md:grid-cols-3 lg:grid-cols-6">
      {items.map(([label, value, href]) => {
        const body = (
          <>
            <dt className="text-sm text-muted">{label}{href && <span className="text-accent"> ↗</span>}</dt>
            <dd className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">{value == null ? "—" : value.toLocaleString()}</dd>
          </>
        );
        return (
          <div key={label} className="-mb-px -mr-px border-b border-r border-line">
            {href ? <a href={href} className="block p-6 transition-colors hover:bg-surface">{body}</a> : <div className="p-6">{body}</div>}
          </div>
        );
      })}
    </dl>
  );
}

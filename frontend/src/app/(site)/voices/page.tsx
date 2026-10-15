"use client";
import { useState } from "react";
import Link from "next/link";
import { VOICES, type Voice } from "@/lib/voices";
import { previewVoice, VoiceAvatar } from "@/components/VoicePicker";
import { EngineStatus } from "@/components/EngineStatus";
import { btn, card, PageHero, Spinner } from "@/components/ui";

const FILTERS = ["All", "Female", "Male", "American", "British"] as const;

export default function VoicesPage() {
  const [playing, setPlaying] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [error, setError] = useState("");

  const play = async (v: Voice) => {
    setPlaying(v.id); setError("");
    try { await previewVoice(v); } catch (e) { setError((e as Error).message); } finally { setPlaying(null); }
  };
  const list = VOICES.filter((v) => filter === "All" || v.gender === filter || v.accent === filter);

  return (
    <>
      <PageHero kicker={`Voice library · ${VOICES.length} voices`} title="Find the right voice." accent="Preview it instantly.">
        American and British English voices. Previews are generated live on your device.
      </PageHero>
      <section className="mx-auto max-w-6xl space-y-6 px-5 py-10 md:px-8">
        <EngineStatus />
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${filter === f ? "border-fg bg-fg text-bg" : "border-line text-muted hover:text-fg"}`}>{f}</button>
          ))}
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((v) => (
            <article key={v.id} className={`${card} flex flex-col p-5 transition-colors hover:border-line-strong`}>
              <div className="flex items-center gap-3">
                <VoiceAvatar v={v} />
                <div className="min-w-0 flex-1">
                  <h2 className="font-medium">{v.name}</h2>
                  <p className="text-xs text-muted">{v.accent} · {v.gender} · Grade {v.grade}</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-muted">{v.vibe}</p>
              <code className="mt-2 font-mono text-xs text-subtle">{v.id}</code>
              <div className="mt-5 flex gap-2">
                <button onClick={() => play(v)} disabled={!!playing} className={btn("secondary", "sm")}>
                  {playing === v.id ? <><Spinner /> Playing</> : "Preview"}
                </button>
                <Link href={`/studio/?voice=${v.id}`} className={btn("ghost", "sm")}>Use in studio →</Link>
              </div>
            </article>
          ))}
        </div>
        <p className="text-center text-xs text-subtle">Grades are the model authors&apos; own quality ratings. Higher grades sound most natural on long passages.</p>
      </section>
    </>
  );
}

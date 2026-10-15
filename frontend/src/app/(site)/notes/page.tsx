"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { LiveSession } from "@/components/notes/LiveSession";
import { NoteView } from "@/components/notes/NoteView";
import { btn, card, PageHero, Spinner } from "@/components/ui";
import { notesDb, type Note } from "@/lib/local-db";
import { clock } from "@/lib/subtitles";

function Notes() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("id");
  const isNew = params.has("new");
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [open, setOpen] = useState<Note | null>(null);

  useEffect(() => {
    if (id) notesDb.get(id).then((n) => setOpen(n ?? null));
    else notesDb.list().then(setNotes).catch(() => setNotes([]));
  }, [id]);

  if (isNew) return <LiveSession onDone={(nid) => router.replace(`/notes/?id=${nid}`)} />;
  if (id) return open ? <NoteView key={open.id} initial={open} onDelete={() => router.replace("/notes/")} /> : <Spinner />;

  return (
    <div className="space-y-6">
      <Link href="/notes/?new" className={btn("primary", "lg")}>New meeting or note</Link>
      {notes === null ? <Spinner /> : notes.length === 0 ? (
        <p className="text-sm text-subtle">No notes yet. They&apos;re stored in this browser only.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((n) => (
            <Link key={n.id} href={`/notes/?id=${n.id}`} className={`${card} group p-5 transition-colors hover:border-accent/40`}>
              <p className="label text-[10px] text-accent">{n.kind === "personal" ? "My note" : "Meeting"}</p>
              <p className="display mt-1 truncate text-xl group-hover:text-accent">{n.title}</p>
              <p className="mt-1 font-mono text-[11px] text-subtle">{new Date(n.createdAt).toLocaleDateString()} · {clock(n.duration)} · {n.lines.length} lines</p>
              <p className="mt-3 line-clamp-3 text-sm text-muted">{(n.kind === "personal" ? n.scratch : n.lines.slice(0, 4).map((l) => l.text).join(" ")) || "Empty"}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NotesPage() {
  return (
    <>
      <PageHero kicker="Notetaker" title="Meetings," accent="written down.">
        Transcribe a meeting live, with you and everyone else labelled, then get highlights, action items and decisions the moment
        you stop. Or just talk to write your own notes. No bot joins your call and no audio leaves your device.
      </PageHero>
      <section className="mx-auto max-w-6xl px-5 py-10 md:px-8">
        <Suspense fallback={<Spinner />}><Notes /></Suspense>
      </section>
    </>
  );
}

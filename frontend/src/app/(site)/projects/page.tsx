"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, useAuth, type Project, type ProjectSummary } from "@/lib/api";
import { Badge, btn, card, input, PageHero } from "@/components/ui";

const KINDS = { audiobook: "Audiobook", podcast: "Podcast", voiceover: "Voiceover", other: "Other" } as const;

export default function ProjectsPage() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<Project["kind"]>("audiobook");
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) api<{ projects: ProjectSummary[] }>("/api/projects").then((r) => setProjects(r.projects)).catch((e) => setError(e.message));
  }, [user]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { project } = await api<{ project: Project }>("/api/projects", { method: "POST", json: {
        title: title.trim() || "Untitled project", kind,
        blocks: [{ text: "Start writing your first paragraph here.", voice: "af_heart", speed: 1, pauseAfter: 0.5 }],
      } });
      router.push(`/projects/edit/?id=${project._id}`);
    } catch (err) { setError((err as Error).message); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this project? This can't be undone.")) return;
    await api(`/api/projects/${id}`, { method: "DELETE" }).catch((e) => setError(e.message));
    setProjects((p) => p?.filter((x) => x._id !== id) ?? null);
  };

  return (
    <>
      <PageHero kicker="Projects" title="Long-form audio," accent="any length.">
        Split a script into blocks, give each block a voice and a pause, and export one finished WAV. Works for audiobooks, podcasts and voiceovers.
      </PageHero>

      <section className="mx-auto max-w-6xl px-5 py-10 md:px-8">
        {ready && !user && (
          <div className={`${card} flex flex-wrap items-center gap-6 p-8`}>
            <div className="flex-1">
              <h2 className="text-lg font-medium">Projects are saved to your free account</h2>
              <p className="mt-1 text-sm text-muted">Sign in to create projects and pick them up on any device.</p>
            </div>
            <Link href="/auth/?mode=register&next=/projects/" className={btn("primary")}>Create free account</Link>
          </div>
        )}

        {user && (
          <>
            <form onSubmit={create} className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
              <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Project name" maxLength={140} />
              <select className={input} value={kind} onChange={(e) => setKind(e.target.value as Project["kind"])} aria-label="Project type">
                {Object.entries(KINDS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
              <button className={btn("primary")}>New project</button>
            </form>
            {error && <p className="mt-4 text-sm text-danger">{error}</p>}

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects?.map((p) => (
                <div key={p._id} className={`${card} group flex flex-col p-5 transition-colors hover:border-line-strong`}>
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/projects/edit/?id=${p._id}`} className="font-medium leading-snug hover:underline">{p.title}</Link>
                    <Badge>{KINDS[p.kind]}</Badge>
                  </div>
                  <p className="mt-3 text-sm text-muted">
                    {p.blockCount} blocks · {p.characters.toLocaleString()} characters · ~{Math.max(1, Math.round(p.characters / 900))} min
                  </p>
                  <p className="text-xs text-subtle">Edited {new Date(p.updatedAt).toLocaleDateString()}</p>
                  <div className="mt-5 flex gap-2">
                    <Link href={`/projects/edit/?id=${p._id}`} className={btn("secondary", "sm")}>Open</Link>
                    <button onClick={() => remove(p._id)} className={btn("ghost", "sm")}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
            {projects && !projects.length && (
              <p className="mt-16 text-center text-sm text-muted">No projects yet. Create one above.</p>
            )}
          </>
        )}
      </section>
    </>
  );
}

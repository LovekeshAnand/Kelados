"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, useAuth, type ApiKey, type Preset, type Rule } from "@/lib/api";
import { VOICES, voiceById } from "@/lib/voices";
import { VoicePicker } from "@/components/VoicePicker";
import { btn, card, input } from "@/components/ui";

const TABS = ["overview", "keys", "presets", "lexicon", "account"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = { overview: "Overview", keys: "API keys", presets: "Voice presets", lexicon: "Pronunciation", account: "Account" };
const SRC_COLOR = { web: "#f2b45a", sdk: "#8fb4ff", server: "#7dd3c0" } as const;
const PRESET_COLORS = ["#f2b45a", "#8fb4ff", "#b9a3ff", "#7dd3c0", "#f29a9a", "#c7d97a", "#e0b3e6"];

type UsageRow = { day: string; source: keyof typeof SRC_COLOR; characters: number; seconds: number; generations: number };

function Overview() {
  const [usage, setUsage] = useState<{ rows: UsageRow[]; totals: { characters: number; seconds: number; generations: number } } | null>(null);
  const [days] = useState(() => Array.from({ length: 30 }, (_, i) => new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(0, 10)));
  useEffect(() => { api<typeof usage>("/api/usage?days=30").then(setUsage).catch(() => {}); }, []);

  const byDay = new Map<string, UsageRow[]>();
  usage?.rows.forEach((r) => byDay.set(r.day, [...(byDay.get(r.day) ?? []), r]));
  const max = Math.max(1, ...days.map((d) => (byDay.get(d) ?? []).reduce((n, r) => n + r.characters, 0)));
  const t = usage?.totals;
  const saved = ((t?.characters ?? 0) / 1000) * 0.3; // rough estimate: ~$0.30 per 1k chars, typical of paid TTS tiers

  return (
    <div className="space-y-6">
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Characters (30 days)", (t?.characters ?? 0).toLocaleString()],
          ["Audio generated", `${((t?.seconds ?? 0) / 60).toFixed(1)} min`],
          ["Generations", (t?.generations ?? 0).toLocaleString()],
          ["Est. saved vs paid TTS", `$${saved.toFixed(2)}`],
        ].map(([label, value]) => (
          <div key={label} className={`${card} p-5`}>
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{value}</dd>
          </div>
        ))}
      </dl>
      <div className={`${card} p-5`}>
        <div className="flex flex-wrap items-center gap-4">
          <h3 className="mr-auto font-medium">Characters per day</h3>
          {Object.entries(SRC_COLOR).map(([s, c]) => (
            <span key={s} className="flex items-center gap-1.5 text-xs text-muted"><span className="size-2 rounded-sm" style={{ background: c }} />{s}</span>
          ))}
        </div>
        <div className="mt-6 flex h-48 items-end gap-1" role="img" aria-label="Characters generated per day over the last 30 days">
          {days.map((d) => {
            const rows = byDay.get(d) ?? [];
            const total = rows.reduce((n, r) => n + r.characters, 0);
            return (
              <div key={d} className="flex h-full flex-1 flex-col-reverse" title={`${d}: ${total.toLocaleString()} characters`}>
                {rows.map((r) => (
                  <div key={r.source} style={{ height: `${(r.characters / max) * 100}%`, background: SRC_COLOR[r.source] }} className="last:rounded-t-sm" />
                ))}
                {!total && <div className="h-px bg-line" />}
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex justify-between text-xs text-subtle"><span>{days[0]}</span><span>Today</span></div>
      </div>
      <p className="text-xs text-subtle">Only counts are recorded. Your text and audio never reach our servers.</p>
    </div>
  );
}

function Keys() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [name, setName] = useState("");
  const [fresh, setFresh] = useState("");
  const [error, setError] = useState("");
  const load = () => api<{ keys: ApiKey[] }>("/api/keys").then((r) => setKeys(r.keys)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const r = await api<{ key: string }>("/api/keys", { method: "POST", json: { name: name.trim() || "Untitled key" } });
      setFresh(r.key); setName(""); load();
    } catch (err) { setError((err as Error).message); }
  };
  const revoke = async (id: string) => {
    if (!confirm("Revoke this key? Apps using it will stop syncing.")) return;
    await api(`/api/keys/${id}`, { method: "DELETE" }).catch((e) => setError(e.message));
    load();
  };

  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-sm leading-relaxed text-muted">
        API keys let the <Link href="/developers/" className="text-fg underline underline-offset-2">Kelados SDK and CLI</Link> sync your presets and pronunciation rules, and report usage here.
        Speech is always generated on the machine running your code.
      </p>
      <form onSubmit={create} className="flex flex-wrap gap-2">
        <input className={`${input} max-w-sm`} value={name} onChange={(e) => setName(e.target.value)} placeholder="Key name, e.g. production" maxLength={60} />
        <button className={btn("primary")}>Create key</button>
      </form>
      {fresh && (
        <div className="space-y-3 rounded-xl border border-accent/40 bg-accent-soft p-4">
          <p className="text-sm font-medium">Copy your key now. For security, it won&apos;t be shown again.</p>
          <div className="flex flex-wrap gap-2">
            <code className="flex-1 break-all rounded-lg border border-line bg-bg p-3 font-mono text-sm">{fresh}</code>
            <button className={btn("secondary", "md")} onClick={() => navigator.clipboard.writeText(fresh)}>Copy</button>
          </div>
        </div>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-xs text-muted"><tr><th className="p-3 font-normal">Name</th><th className="p-3 font-normal">Key</th><th className="p-3 font-normal">Created</th><th className="p-3 font-normal">Last used</th><th /></tr></thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k._id} className="border-t border-line">
                <td className="p-3">{k.name}</td>
                <td className="p-3 font-mono text-xs text-muted">{k.prefix}••••••••</td>
                <td className="p-3 text-muted">{new Date(k.createdAt).toLocaleDateString()}</td>
                <td className="p-3 text-muted">{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : "Never"}</td>
                <td className="p-3 text-right"><button onClick={() => revoke(k._id)} className="text-xs text-danger hover:underline">Revoke</button></td>
              </tr>
            ))}
            {!keys.length && <tr><td colSpan={5} className="p-6 text-center text-muted">No API keys yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Presets() {
  const { presets, refreshWorkspace } = useAuth();
  const [draft, setDraft] = useState({ name: "", voice: "af_heart", speed: 1, color: PRESET_COLORS[0] });
  const [error, setError] = useState("");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await api("/api/presets", { method: "POST", json: { ...draft, name: draft.name.trim() || voiceById(draft.voice).name } }); setDraft({ ...draft, name: "" }); refreshWorkspace(); }
    catch (err) { setError((err as Error).message); }
  };
  const remove = async (p: Preset) => { await api(`/api/presets/${p._id}`, { method: "DELETE" }).catch((e) => setError(e.message)); refreshWorkspace(); };

  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-sm leading-relaxed text-muted">A preset saves a voice and speed under a name. Apply it in the studio with one click, or from code with <code className="text-fg">speak(text, {"{ preset: \"Narrator\" }"})</code>.</p>
      <form onSubmit={save} className={`${card} grid gap-4 p-4 md:grid-cols-[1fr_1.4fr_180px]`}>
        <input className={input} placeholder="Preset name, e.g. Narrator" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} maxLength={60} />
        <VoicePicker value={draft.voice} onChange={(voice) => setDraft({ ...draft, voice, color: voiceById(voice).color })} />
        <label className="text-xs text-muted">Speed {draft.speed.toFixed(2)}×
          <input type="range" min={0.5} max={2} step={0.05} value={draft.speed} onChange={(e) => setDraft({ ...draft, speed: +e.target.value })} className="mt-2 block w-full" />
        </label>
        <div className="flex items-center gap-2 md:col-span-3">
          <span className="text-xs text-muted">Color</span>
          {PRESET_COLORS.map((c) => (
            <button type="button" key={c} onClick={() => setDraft({ ...draft, color: c })} aria-label={`Color ${c}`}
              className={`size-5 rounded-full ring-offset-2 ring-offset-surface ${draft.color === c ? "ring-2 ring-fg" : ""}`} style={{ background: c }} />
          ))}
          <button className={`${btn("primary")} ml-auto`}>Save preset</button>
        </div>
      </form>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {presets.map((p) => (
          <div key={p._id} className={`${card} p-4`}>
            <div className="flex items-center gap-2"><span className="size-3 rounded-full" style={{ background: p.color }} /><p className="font-medium">{p.name}</p></div>
            <p className="mt-1 text-sm text-muted">{voiceById(p.voice).name} · {p.speed.toFixed(2)}×</p>
            <div className="mt-4 flex gap-2">
              <Link href={`/studio/?voice=${p.voice}`} className={btn("secondary", "sm")}>Use</Link>
              <button onClick={() => remove(p)} className={btn("ghost", "sm")}>Delete</button>
            </div>
          </div>
        ))}
      </div>
      {!presets.length && <p className="text-sm text-muted">No presets yet. Choose from {VOICES.length} voices above.</p>}
    </div>
  );
}

function Lexicon() {
  const { lexicon, refreshWorkspace } = useAuth();
  const [rules, setRules] = useState<Rule[]>(lexicon);
  const [msg, setMsg] = useState("");

  const save = async () => {
    try {
      await api("/api/lexicon", { method: "PUT", json: { rules: rules.filter((r) => r.from.trim() && r.to.trim()) } });
      await refreshWorkspace();
      setMsg("Saved");
    } catch (e) { setMsg((e as Error).message); }
  };

  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-sm leading-relaxed text-muted">
        Tell every voice how to say brand names, acronyms and jargon. Write the replacement the way it sounds. Rules apply in the studio, in projects and in the SDK.
      </p>
      <div className="space-y-2">
        {rules.map((r, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <input className={`${input} max-w-60`} value={r.from} placeholder="Kelados" onChange={(e) => setRules(rules.map((x, j) => (j === i ? { ...x, from: e.target.value } : x)))} />
            <span className="text-muted">→</span>
            <input className={`${input} max-w-60`} value={r.to} placeholder="keh-lah-dos" onChange={(e) => setRules(rules.map((x, j) => (j === i ? { ...x, to: e.target.value } : x)))} />
            <button onClick={() => setRules(rules.filter((_, j) => j !== i))} className={btn("ghost", "sm")}>Remove</button>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button className={btn("secondary", "sm")} onClick={() => setRules([...rules, { from: "", to: "" }])}>Add rule</button>
        <button className={btn("primary", "sm")} onClick={save}>Save rules</button>
        {msg && <span className="text-xs text-muted">{msg}</span>}
      </div>
    </div>
  );
}

// Remount when the synced lexicon changes so the editor starts from server state.
function LexiconTab() {
  const { lexicon } = useAuth();
  return <Lexicon key={JSON.stringify(lexicon)} />;
}

function Account() {
  const { user, setUser, logout } = useAuth();
  const router = useRouter();
  const [name, setName] = useState(user?.name ?? "");
  const [msg, setMsg] = useState("");

  return (
    <div className="max-w-lg space-y-8">
      <form className="space-y-3" onSubmit={async (e) => {
        e.preventDefault();
        try { const r = await api<{ user: typeof user }>("/api/auth/me", { method: "PATCH", json: { name } }); if (r.user) setUser(r.user); setMsg("Saved"); }
        catch (err) { setMsg((err as Error).message); }
      }}>
        <label className="text-sm font-medium">Display name</label>
        <input className={input} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
        <p className="text-xs text-muted">Email: {user?.email}</p>
        <div className="flex items-center gap-3"><button className={btn("primary", "sm")}>Save</button>{msg && <span className="text-xs text-muted">{msg}</span>}</div>
      </form>
      <button className={btn("secondary", "sm")} onClick={() => { logout(); router.push("/"); }}>Sign out</button>
      <div className="rounded-xl border border-danger/30 p-5">
        <h3 className="font-medium text-danger">Delete account</h3>
        <p className="mt-1 text-sm text-muted">Permanently deletes your account, projects, presets, rules, keys and usage. History stored in your browser is not affected.</p>
        <button className={`${btn("danger", "sm")} mt-4`} onClick={async () => {
          if (prompt('Type "delete" to permanently delete your account') !== "delete") return;
          await api("/api/auth/me", { method: "DELETE" });
          logout(); router.push("/");
        }}>Delete account</button>
      </div>
    </div>
  );
}

function Dashboard() {
  const { user, ready } = useAuth();
  const params = useSearchParams();
  const router = useRouter();
  const tab: Tab = TABS.includes(params.get("tab") as Tab) ? (params.get("tab") as Tab) : "overview";

  if (!ready) return <div className="p-20 text-center text-sm text-muted">Loading…</div>;
  if (!user) return (
    <div className="mx-auto max-w-md px-5 py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in to open the console</h1>
      <p className="mt-2 text-sm text-muted">Manage API keys, presets, pronunciation rules and usage.</p>
      <Link href="/auth/?next=/dashboard/" className={`${btn("primary")} mt-6`}>Sign in</Link>
    </div>
  );

  return (
    <section className="mx-auto max-w-6xl px-5 py-10 md:px-8">
      <h1 className="text-2xl font-semibold tracking-tight">Console</h1>
      <p className="mt-1 text-sm text-muted">Signed in as {user.email}</p>
      <nav className="mt-6 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <button key={t} onClick={() => router.replace(`/dashboard/?tab=${t}`)}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors ${tab === t ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg"}`}>{TAB_LABEL[t]}</button>
        ))}
      </nav>
      <div className="mt-8">
        {tab === "overview" && <Overview />}
        {tab === "keys" && <Keys />}
        {tab === "presets" && <Presets />}
        {tab === "lexicon" && <LexiconTab />}
        {tab === "account" && <Account />}
      </div>
    </section>
  );
}

export default function DashboardPage() {
  return <Suspense><Dashboard /></Suspense>;
}

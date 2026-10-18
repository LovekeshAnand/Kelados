"use client";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { GITHUB_URL } from "./Footer";
import { btn, card, Spinner } from "./ui";

type OS = "windows" | "mac" | "linux" | "mobile";
type Asset = { name: string; size: number; browser_download_url: string; digest?: string | null };
type Release = { tag_name: string; published_at: string; html_url: string; assets: Asset[] };

const API = GITHUB_URL.replace("https://github.com/", "https://api.github.com/repos/") + "/releases/latest";

type Platform = "windows" | "mac" | "linux";
export const BUILDS: Record<Platform, { label: string; file: string; note: string }> = {
  windows: { label: "Windows", file: "Kelados-Setup.exe", note: "Windows 10 and 11 · 64-bit" },
  mac: { label: "Mac", file: "Kelados-mac.zip", note: "macOS 11+ · Apple silicon and Intel" },
  linux: { label: "Linux", file: "Kelados.AppImage", note: "AppImage · x64" },
};
// The same scripts install a fresh copy or update an existing one, keeping settings and history.
export const INSTALL_CMD = { windows: "irm https://kelados.in/install.ps1 | iex", unix: "curl -fsSL https://kelados.in/install.sh | sh" };

function Command({ cmd }: { cmd: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-sm border border-line bg-bg py-1.5 pl-3 pr-1.5">
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-[13px] text-fg">{cmd}</code>
      <button onClick={() => { navigator.clipboard.writeText(cmd); setCopied(true); }} className={btn("secondary", "sm")}>{copied ? "Copied" : "Copy"}</button>
    </div>
  );
}

const STEPS: Record<Platform, React.ReactNode[]> = {
  windows: [
    <>Run <b>Kelados-Setup.exe</b>. It installs for your user only, so no admin rights are needed, and starts by itself.</>,
    <>Windows may show <b>&ldquo;Windows protected your PC&rdquo;</b> because the app isn&apos;t code-signed yet. Click <b>More info → Run anyway</b>.</>,
    <>A welcome window opens. Click in its box, press <b>Ctrl+Shift+Space</b>, and talk.</>,
  ],
  mac: [
    <>Open <b>Terminal</b> and paste the command above. It downloads Kelados into Applications and opens it.</>,
    <>Kelados isn&apos;t notarized by Apple yet, so the script signs it on your Mac (no Apple account needed) and clears the download flag. That&apos;s what lets it open normally.</>,
    <>Allow <b>Microphone</b> and <b>Accessibility</b> when macOS asks, then press <b>Cmd+Shift+Space</b> in any app and talk.</>,
  ],
  linux: [
    <>Make it executable: <code className="font-mono text-accent">chmod +x Kelados.AppImage</code>, then run it.</>,
    <>Install <code className="font-mono text-accent">xdotool</code> so Kelados can type (<code className="font-mono">sudo apt install xdotool</code>). AppImages also need FUSE (<code className="font-mono">libfuse2</code>).</>,
    <>Press <b>Ctrl+Shift+Space</b> in any app and talk. In terminals, use Ctrl+Shift+V if text doesn&apos;t appear.</>,
  ],
};

function detectOS(): OS {
  const ua = navigator.userAgent;
  if (/Android|iPhone|iPad|iPod/i.test(ua)) return "mobile";
  if (/Mac/i.test(ua)) return "mac";
  if (/Linux|X11|CrOS/i.test(ua)) return "linux";
  return "windows";
}
const noop = () => () => {};
const mb = (n: number) => `${Math.round(n / 1e6)} MB`;

export function DownloadPanel() {
  const os = useSyncExternalStore(noop, detectOS, () => "windows" as OS);
  const [release, setRelease] = useState<Release | null | "none">(null);
  const [pick, setPick] = useState<Platform | null>(null);
  const target: Platform = pick ?? (os === "linux" || os === "mac" ? os : "windows");

  useEffect(() => {
    fetch(API, { headers: { accept: "application/vnd.github+json" } })
      .then((r) => (r.ok ? r.json() : "none"))
      .then(setRelease, () => setRelease("none"));
  }, []);

  const asset = (o: keyof typeof BUILDS) => (release && release !== "none" ? release.assets.find((a) => a.name === BUILDS[o].file) : undefined);
  const main = asset(target);

  return (
    <div className="space-y-6">
      {os === "mobile" && (
        <p className="rounded-sm border border-accent/30 bg-accent-soft p-4 text-sm text-accent">
          The desktop app is for Windows, Mac and Linux. On your phone, <Link href="/dictate/" className="underline">dictate in the browser</Link> instead.
        </p>
      )}

      <div className={`${card} relative overflow-hidden p-6 md:p-8`}>
        <div className="dots-ramp pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative flex flex-wrap items-center gap-6">
          <div className="min-w-0 grow basis-60">
            <p className="label text-xs text-accent">{pick ? "Selected" : "Recommended for your computer"}</p>
            <h2 className="display mt-1 text-5xl">Kelados for {BUILDS[target].label}</h2>
            <p className="mt-2 font-mono text-xs text-muted">
              {BUILDS[target].note}
              {main && release && release !== "none" && <> · {release.tag_name} · {mb(main.size)} · released {new Date(release.published_at).toLocaleDateString()}</>}
            </p>
          </div>
          {release === null ? (
            <span className="flex items-center gap-2 text-sm text-muted"><Spinner /> Checking the latest version…</span>
          ) : main && target === "mac" ? (
            <div className="w-full max-w-md"><Command cmd={INSTALL_CMD.unix} /></div>
          ) : main ? (
            <a href={main.browser_download_url} className={btn("primary", "lg")}>Download for {BUILDS[target].label}</a>
          ) : (
            <span className="max-w-xs text-sm text-muted">
              The first {BUILDS[target].label} build is on its way. Until then, <Link href="/dictate/" className="text-accent hover:underline">dictate in the browser</Link> or build it from source below.
            </span>
          )}
        </div>
        <div className="relative mt-6 flex flex-wrap gap-2 border-t border-line pt-4 text-sm">
          <span className="text-subtle">Other platforms:</span>
          {(Object.keys(BUILDS) as (keyof typeof BUILDS)[]).filter((o) => o !== target).map((o) => (
            <button key={o} onClick={() => setPick(o)} className="text-accent hover:underline">{BUILDS[o].label}</button>
          ))}
          {release && release !== "none" && <a href={release.html_url} className="ml-auto text-muted hover:text-fg">Release notes →</a>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className={`${card} p-6`}>
          <h3 className="label text-sm text-accent">Install on {BUILDS[target].label}</h3>
          <ol className="mt-4 space-y-3 text-sm leading-relaxed">
            {STEPS[target].map((s, i) => (
              <li key={i} className="grid grid-cols-[2rem_1fr] gap-2"><span className="font-mono text-accent">{String(i + 1).padStart(2, "0")}</span><span>{s}</span></li>
            ))}
          </ol>
        </div>
        <div className={`${card} space-y-4 p-6 text-sm`}>
          <h3 className="label text-sm text-accent">Install or update with one command</h3>
          <p className="text-muted">Already have Kelados? Run this to update it in place; your settings and history stay. It also works for a fresh install.</p>
          <p className="text-xs text-subtle">Windows (PowerShell)</p>
          <Command cmd={INSTALL_CMD.windows} />
          <p className="text-xs text-subtle">Mac and Linux (Terminal)</p>
          <Command cmd={INSTALL_CMD.unix} />
          <h3 className="label pt-2 text-sm text-accent">Good to know</h3>
          <p className="text-muted">Free, no account, no limits. Speech is recognised on your computer; the first launch downloads the speech model once (about a minute).</p>
          <p className="text-muted">The app always uses the newest Kelados models and fixes, so you rarely need to reinstall.</p>
          {main?.digest && (
            <p className="break-all font-mono text-[11px] text-subtle">SHA-256 {main.digest.replace(/^sha256:/, "")}</p>
          )}
          <p className="text-muted">
            Build it yourself: <code className="font-mono text-fg">cd desktop &amp;&amp; npm install &amp;&amp; npm run dist</code>{" "}
            (<a href={`${GITHUB_URL}/tree/main/desktop`} className="text-accent hover:underline">source</a>).
          </p>
        </div>
      </div>
    </div>
  );
}

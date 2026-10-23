import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { GITHUB_URL } from "@/components/Footer";
import { Faq } from "@/components/Faq";
import { JsonLd } from "@/components/JsonLd";
import { btn, card, Kicker, PageHero } from "@/components/ui";
import { breadcrumbSchema, pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  path: "/integrations/",
  title: "Voice Typing for Google Docs, Word & Claude Code",
  social: "Kelados Integrations – Dictate Into Google Docs, Word and Claude Code",
  description: "Free voice typing for Google Docs, Gmail and any website (Chrome extension), Microsoft Word (add-in) and Claude Code (MCP server and desktop dictation). Speech is recognised on your device.",
});

const FAQ = [
  ["How do I use voice typing in Google Docs?", "Install the Kelados Chrome extension, click into your document and press Alt+Shift+D. Talk, and each phrase is typed at your cursor with punctuation and filler words removed."],
  ["Can I dictate in Microsoft Word for free?", "Yes. Add the Kelados Word add-in from its manifest (Insert → Add-ins → Upload My Add-in on the web), then open Home → Kelados. Or use the desktop app, which types into Word directly."],
  ["How do I talk to Claude Code with my voice?", "Run the Kelados desktop app, focus the terminal running Claude Code and press Ctrl+Shift+Space to speak your prompt. To let Claude speak back, run: claude mcp add kelados -- npx -y kelados mcp."],
  ["Do the integrations upload my audio?", "No. Every integration uses the same on-device speech recognition as the Kelados website. Audio never leaves your computer."],
] as const;

const CLAUDE_HOOK = `{
  "hooks": {
    "Stop": [{ "hooks": [{ "type": "command", "command": "npx -y kelados say \\"Claude is done\\"" }] }]
  }
}`;

function Block({ id, kicker, title, children, aside }: { id: string; kicker: string; title: ReactNode; children: ReactNode; aside: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 border-b border-line py-16">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <Kicker>{kicker}</Kicker>
          <h2 className="display mt-4 text-5xl">{title}</h2>
          <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-muted">{children}</div>
        </div>
        <div className={`${card} p-6`}>{aside}</div>
      </div>
    </section>
  );
}

const Steps = ({ items }: { items: ReactNode[] }) => (
  <ol className="space-y-3 text-sm">
    {items.map((s, i) => (
      <li key={i} className="grid grid-cols-[2rem_1fr] gap-2"><span className="font-mono text-accent">{String(i + 1).padStart(2, "0")}</span><span>{s}</span></li>
    ))}
  </ol>
);

const Code = ({ children }: { children: string }) => (
  <pre className="overflow-x-auto rounded-sm border border-line bg-bg p-4 font-mono text-[12px] leading-relaxed text-fg">{children}</pre>
);

export default function IntegrationsPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema("Integrations", "/integrations/")} />
      <PageHero kicker="Integrations" title="Write by talking," accent="wherever you work.">
        Kelados plugs into the apps you already write in. Every integration recognises speech on your own device and costs nothing.
      </PageHero>

      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <Block id="chrome" kicker="Chrome extension" title={<>Google Docs <span className="text-accent">and the web</span></>}
          aside={<Steps items={[
            <>Download <a className="text-accent hover:underline" data-download="chrome" href={`${GITHUB_URL}/releases/latest/download/kelados-chrome.zip`}>kelados-chrome.zip</a> and unzip it.</>,
            <>Open <code className="font-mono">chrome://extensions</code>, turn on Developer mode, and click <b>Load unpacked</b> on the folder.</>,
            <>In Google Docs (or any text box), press <b>Alt+Shift+D</b> or click the Kelados icon.</>,
            <>Allow the microphone once. Talk; each phrase appears at your cursor. Close the small window to stop.</>,
          ]} />}>
          <p>Dictate into Google Docs, Gmail, Notion, LinkedIn, ChatGPT, claude.ai and any other page. Text goes in at the cursor
            with punctuation, fillers removed, and your snippets expanded.</p>
          <p>The extension only acts on the tab where you start it, and only after you press the shortcut.</p>
        </Block>

        <Block id="word" kicker="Microsoft Word" title={<>Word, <span className="text-accent">by voice</span></>}
          aside={<Steps items={[
            <>Download the <a className="text-accent hover:underline" href="/kelados-word-manifest.xml" download>add-in manifest</a>.</>,
            <><b>Word on the web:</b> Insert → Add-ins → My Add-ins → Upload My Add-in, then pick the file.</>,
            <><b>Word for Windows or Mac:</b> put the file in a shared folder added under Trust Center → Trusted Add-in Catalogs, then Insert → My Add-ins → Shared Folder.</>,
            <>Open <b>Home → Kelados</b>. Press the mic and talk, or have the selection or the whole document read aloud.</>,
          ]} />}>
          <p>A side panel that writes where your cursor is, with spoken commands like &ldquo;new paragraph&rdquo; and &ldquo;bullet point&rdquo;.
            It can also read your draft back in a natural voice, which helps catch mistakes your eyes skip.</p>
          <p>Prefer no add-in? The <Link href="/download/" className="text-accent hover:underline">desktop app</Link> types into Word too.</p>
        </Block>

        <Block id="claude-code" kicker="Claude Code" title={<>Talk to <span className="text-accent">Claude Code</span></>}
          aside={<div className="space-y-5">
            <div><p className="label mb-2 text-xs text-accent">Speak your prompts</p>
              <p className="text-sm text-muted">Install the <Link href="/download/" className="text-accent hover:underline">desktop app</Link>, click into the terminal running Claude Code, and press Ctrl+Shift+Space.</p></div>
            <div><p className="label mb-2 text-xs text-accent">Let Claude talk back (MCP)</p>
              <Code>claude mcp add kelados -- npx -y kelados mcp</Code>
              <p className="mt-2 text-sm text-muted">Then ask: &ldquo;read me a summary of what you changed&rdquo;. Tools: <code className="font-mono">speak</code>, <code className="font-mono">save_speech</code>, <code className="font-mono">list_voices</code>.</p></div>
            <div><p className="label mb-2 text-xs text-accent">Hear when it&apos;s done (hook)</p>
              <p className="mb-2 text-sm text-muted">Add to <code className="font-mono">~/.claude/settings.json</code>:</p>
              <Code>{CLAUDE_HOOK}</Code></div>
          </div>}>
          <p>Describe what you want out loud; it&apos;s faster than typing and much faster for long, detailed prompts.
            The MCP server lets Claude Code, or any MCP-capable agent, speak results through Kelados voices.</p>
          <p>Everything runs locally: your prompts and code never go to Kelados.</p>
        </Block>

        <Block id="desktop" kicker="Everything else" title={<>Any app, <span className="text-accent">one shortcut</span></>}
          aside={<div className="space-y-4">
            <p className="text-sm text-muted">Slack, Teams, Outlook, VS Code, Cursor, Notion desktop, Obsidian, terminals: if it has a cursor, Kelados can type into it.</p>
            <Link href="/download/" className={btn("primary", "md")}>Download the desktop app</Link>
          </div>}>
          <p>The desktop app is the universal integration. It runs in your tray and types into whatever window is focused.</p>
        </Block>

        <section className="max-w-3xl py-16">
          <h2 className="display text-4xl">Questions</h2>
          <div className="mt-6"><Faq items={FAQ} /></div>
        </section>
      </div>
    </>
  );
}

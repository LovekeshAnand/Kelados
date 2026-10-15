"use client";
import { useState } from "react";

const TABS = [
  ["Desktop", "Download the app, then hold Ctrl+Shift+Space in any app and talk."],
  ["Terminal", "npm install -g kelados && kelados say \"Hello from Kelados\""],
  ["Claude Code", "claude mcp add kelados -- npx -y kelados mcp"],
] as const;

/** Hermes-style "install via" switcher with a copyable command line. */
export function InstallTabs() {
  const [tab, setTab] = useState(0);
  const [copied, setCopied] = useState(false);
  const [, line] = TABS[tab];
  const isCmd = tab > 0;
  return (
    <div className="max-w-xl">
      <p className="label text-xs text-muted">Use it from</p>
      <div className="mt-3 overflow-hidden rounded-sm border border-line-strong bg-surface">
        <div className="grid grid-cols-3 border-b border-line-strong" role="tablist">
          {TABS.map(([name], i) => (
            <button key={name} role="tab" aria-selected={tab === i} onClick={() => { setTab(i); setCopied(false); }}
              className={`label py-2.5 text-xs transition-colors ${tab === i ? "bg-accent text-bg" : "text-muted hover:text-fg"}`}>
              {name}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 px-4 py-3.5 font-mono text-[13px]">
          {isCmd && <span className="text-accent">$</span>}
          <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap text-fg">{line}</code>
          {isCmd && (
            <button className="label shrink-0 text-[11px] text-muted hover:text-accent"
              onClick={() => { navigator.clipboard.writeText(line); setCopied(true); }}>{copied ? "Copied" : "Copy"}</button>
          )}
        </div>
      </div>
    </div>
  );
}

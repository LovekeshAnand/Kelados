"use client";
import { useState } from "react";
import { useSnippets } from "@/lib/speech/snippets";
import { btn, input } from "./ui";

/** Edit "when I say X, write Y": snippets and personal-dictionary fixes in one list. */
export function SnippetEditor() {
  const { items, save } = useSnippets();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const set = (i: number, k: "trigger" | "text", v: string) => save(items.map((s, j) => (j === i ? { ...s, [k]: v } : s)));

  const persist = async () => {
    setSaving(true); setMsg("");
    try { await save(items, true); setMsg("Saved"); } catch (e) { setMsg((e as Error).message); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-muted">
        Say the phrase on the left and Kelados writes the right side. Use it for snippets (<em>my address</em>) and for words
        the model mishears (<em>kill a dose</em> → Kelados).
      </p>
      {items.map((s, i) => (
        <div key={i} className="grid grid-cols-[1fr_1.4fr_auto] gap-2">
          <input className={input} placeholder="When I say…" value={s.trigger} onChange={(e) => set(i, "trigger", e.target.value)} />
          <input className={input} placeholder="Write…" value={s.text} onChange={(e) => set(i, "text", e.target.value)} />
          <button className={btn("ghost", "sm")} onClick={() => save(items.filter((_, j) => j !== i))} aria-label="Remove">✕</button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <button className={btn("secondary", "sm")} onClick={() => save([...items, { trigger: "", text: "" }])}>Add phrase</button>
        <button className={btn("primary", "sm")} onClick={persist} disabled={saving}>Save</button>
        {msg && <span className="text-xs text-muted">{msg}</span>}
      </div>
    </div>
  );
}

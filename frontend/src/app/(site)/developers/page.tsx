"use client";
import { useState } from "react";
import Link from "next/link";
import { API_URL } from "@/lib/api";
import { Badge, btn, PageHero } from "@/components/ui";

function Code({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex items-center gap-2 border-b border-line px-4 py-2 text-xs text-subtle">
        <span>{lang}</span>
        <button className="ml-auto hover:text-fg" onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-fg/90"><code>{code}</code></pre>
    </div>
  );
}

function Section({ id, n, title, children }: { id: string; n: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-line py-12">
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <div>
          <span className="font-mono text-sm text-accent">{n}</span>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">{title}</h2>
        </div>
        <div className="min-w-0 space-y-4 text-[15px] leading-relaxed text-muted [&_code]:text-fg [&_strong]:text-fg">{children}</div>
      </div>
    </section>
  );
}

const ENDPOINTS: [string, string, string][] = [
  ["GET", "/api/v1/workspace", "Your presets + pronunciation lexicon (what the SDK syncs)"],
  ["POST", "/api/usage", "{ characters, seconds, source } logs usage to your dashboard"],
  ["GET", "/api/usage?days=30", "Daily usage rows and totals"],
  ["GET/POST", "/api/projects", "List / create long-form projects"],
  ["GET/PUT/DELETE", "/api/projects/:id", "Read, replace or delete a project"],
  ["GET/POST", "/api/presets", "List / create voice presets"],
  ["PUT/DELETE", "/api/presets/:id", "Update / delete a preset"],
  ["GET/PUT", "/api/lexicon", "Read / replace pronunciation rules"],
  ["GET", "/api/stats", "Public counters (no auth)"],
];

export default function DevelopersPage() {
  return (
    <>
      <PageHero kicker="Developers · SDK · CLI · self-hosted API" title="Add voices to your app." accent="Pay nothing.">
        Hosted voice APIs bill you per character because <em>their</em> GPUs do the work. With Kelados your own machine (server, laptop or the user&apos;s browser)
        does it, so it&apos;s free at any scale. Swap it in behind the TTS API you already use.
      </PageHero>

      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <nav className="flex flex-wrap gap-2 py-8">
          {[["#sdk", "Node SDK"], ["#cli", "CLI"], ["#server", "Drop-in server"], ["#browser", "In the browser"], ["#keys", "API keys"], ["#rest", "REST API"], ["#faq", "FAQ"]].map(([h, l]) => (
            <a key={h} href={h} className="rounded-full border border-line px-3 py-1 text-xs text-muted transition-colors hover:border-line-strong hover:text-fg">{l}</a>
          ))}
        </nav>

        <Section id="sdk" n="01" title="Node SDK">
          <p>One package. Downloads the 82M-parameter Kokoro model on first run (~90 MB, cached), then generates speech offline on CPU.</p>
          <Code lang="bash" code="npm install kelados" />
          <Code lang="javascript" code={`import { createKelados } from "kelados";

const kelados = await createKelados();          // runs locally, no key needed

const clip = await kelados.speak("Hello from my app!", { voice: "af_heart", speed: 1.05 });
await clip.save("hello.wav");                   // or clip.toWav() → Buffer

// Stream long text sentence by sentence
for await (const chunk of kelados.stream(longChapter, { voice: "bm_george" })) {
  player.enqueue(chunk.audio, chunk.sampleRate);  // Float32Array @ 24 kHz
}`} />
          <p>Add an API key to use the presets and pronunciation rules from your <Link href="/dashboard/" className="text-fg underline underline-offset-2">console</Link>:</p>
          <Code lang="javascript" code={`const kelados = await createKelados({
  apiKey: process.env.KELADOS_API_KEY,   // kel_...
  baseUrl: "${API_URL}",
});
await kelados.speak("Kelados ships SQL tooling", { preset: "Narrator" });  // lexicon applied automatically`} />
        </Section>

        <Section id="cli" n="02" title="CLI">
          <Code lang="bash" code={`npx kelados speak "The quick brown fox" -v am_fenrir -o fox.wav
npx kelados speak -f chapter-01.txt -v bf_emma -s 0.95 -o chapter-01.wav
npx kelados voices`} />
        </Section>

        <Section id="server" n="03" title="Drop-in API server">
          <p>Run a local server that speaks both the <code>/v1/audio/speech</code> and <code>/v1/text-to-speech/:voice</code> dialects. Point your existing SDKs at it and you&apos;re done.</p>
          <Code lang="bash" code={`npx kelados serve --port 8880 --key my-secret
# Docker / VPS / Raspberry Pi / your laptop: anything with Node 20+`} />
          <Code lang="bash" code={`curl http://localhost:8880/v1/audio/speech \\
  -H "Authorization: Bearer my-secret" -H "content-type: application/json" \\
  -d '{"model": "tts-1", "voice": "nova", "input": "Same code, zero bill."}' -o out.wav`} />
          <Code lang="bash" code={`curl http://localhost:8880/v1/text-to-speech/af_bella \\
  -H "xi-api-key: my-secret" -H "content-type: application/json" \\
  -d '{"text": "Same request, Kelados-shaped invoice: $0."}' -o out.wav`} />
          <p className="text-xs text-subtle">Common voice names map to Kokoro voices (alloy, echo, fable, onyx, nova, shimmer…). Output is WAV or raw PCM.</p>
        </Section>

        <Section id="browser" n="04" title="In your users' browsers">
          <p>Want your web app to talk without any backend? Do what this site does: load the model in a Web Worker and let each visitor&apos;s GPU do the work.</p>
          <Code lang="javascript" code={`// worker.js  (type: "module")
import { KokoroTTS, TextSplitterStream } from "https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/dist/kokoro.web.js";

const tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX",
  { dtype: navigator.gpu ? "fp32" : "q8", device: navigator.gpu ? "webgpu" : "wasm" });

self.onmessage = async ({ data }) => {
  const s = new TextSplitterStream(); s.push(data.text); s.close();
  for await (const { audio } of tts.stream(s, { voice: data.voice }))
    self.postMessage({ audio: audio.audio, rate: audio.sampling_rate });
};`} />
          <p>Our full worker lives in <code>frontend/public/workers/tts.js</code> in the repo. Copy it.</p>
        </Section>

        <Section id="keys" n="05" title="API keys">
          <p>Create keys in the <Link href="/dashboard/?tab=keys" className="text-fg underline underline-offset-2">console</Link>. Send them as <code>x-api-key: kel_…</code> or <code>Authorization: Bearer kel_…</code>.
            Keys are stored as SHA-256 hashes, shown once, and revocable any time.</p>
          <div className="flex flex-wrap gap-3">
            <Badge tone="accent">No credits</Badge>
            <Badge>No per-character billing</Badge>
            <Badge>Text never leaves your machine</Badge>
          </div>
        </Section>

        <Section id="rest" n="06" title="REST API">
          <p>Base URL <code>{API_URL}</code>. Every endpoint accepts an API key except the public stats endpoint.</p>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-left text-sm">
              <tbody>
                {ENDPOINTS.map(([m, p, d]) => (
                  <tr key={p + m} className="border-b border-line last:border-0">
                    <td className="whitespace-nowrap p-3 font-mono text-xs text-accent">{m}</td>
                    <td className="whitespace-nowrap p-3 font-mono text-xs text-fg">{p}</td>
                    <td className="p-3">{d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Code lang="bash" code={`curl ${API_URL}/api/v1/workspace -H "x-api-key: kel_..."`} />
        </Section>

        <Section id="faq" n="07" title="FAQ">
          {[
            ["Is it really unlimited?", "Yes. Generation happens on your device, so there is no meter to run out. The only limit is how long you're willing to wait."],
            ["How good are the voices?", "Kokoro-82M ranked #1 on the community TTS Arena at launch, beating models 10-100× its size. The A-grade voices hold up on long-form narration."],
            ["Which languages?", "Speech: American and British English today. Transcription: 99 languages via Whisper."],
            ["Can I use the audio commercially?", "Yes. The model is Apache-2.0 and Kelados is MIT. Output is yours."],
            ["Why do I need an account at all?", "You don't. Accounts only sync projects, presets and pronunciation rules, and issue API keys."],
          ].map(([q, a]) => (
            <details key={q} className="group rounded-xl border border-line p-4 open:bg-surface">
              <summary className="cursor-pointer list-none font-medium text-fg">{q}<span className="float-right text-muted transition group-open:rotate-45">+</span></summary>
              <p className="mt-2 text-sm">{a}</p>
            </details>
          ))}
        </Section>

        <Section id="license" n="08" title="Open source">
          <p>Frontend, backend and SDK are MIT-licensed. Fork it, self-host it, rebrand it. Voices come from Kokoro-82M (Apache-2.0) by hexgrad; the browser runtime is transformers.js by Hugging Face.</p>
          <Link href="/studio/" className={btn("primary", "md")}>Try the studio</Link>
        </Section>
      </div>
    </>
  );
}

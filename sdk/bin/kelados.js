#!/usr/bin/env node
import { parseArgs } from "node:util";
import { readFile } from "node:fs/promises";
import { createKelados } from "../src/index.js";
import { serve } from "../src/server.js";

const HELP = `kelados: free, unlimited text-to-speech on your own machine

Usage
  kelados speak "Hello world" [-v af_heart] [-s 1.0] [-o out.wav]
  kelados speak -f chapter.txt -o chapter.wav
  kelados voices
  kelados serve [--port 8880] [--host 127.0.0.1] [--key secret]

Options
  -v, --voice     Voice id (see \`kelados voices\`)        -p, --preset  Preset name from your Kelados workspace
  -s, --speed     0.5 – 2.0                               -o, --out     Output WAV path (default speech.wav)
  -f, --file      Read text from a file                   --dtype       q8 (default) | fp32 | fp16 | q4
  --key           Require this bearer key on the local server

Env
  KELADOS_API_KEY   Optional. Syncs presets + pronunciation lexicon and logs usage to your dashboard.
  KELADOS_API_URL   Optional. Your self-hosted Kelados API.`;

const { values: o, positionals: [cmd, ...rest] } = parseArgs({
  allowPositionals: true,
  options: {
    voice: { type: "string", short: "v" }, preset: { type: "string", short: "p" }, speed: { type: "string", short: "s" },
    out: { type: "string", short: "o", default: "speech.wav" }, file: { type: "string", short: "f" },
    port: { type: "string", default: "8880" }, host: { type: "string", default: "127.0.0.1" }, key: { type: "string" },
    dtype: { type: "string", default: "q8" }, help: { type: "boolean", short: "h" },
  },
});

if (!cmd || o.help) { console.log(HELP); process.exit(0); }

let lastPct = -1;
const onProgress = (p) => {
  if (p.status === "progress" && p.file?.endsWith(".onnx")) {
    const pct = Math.floor(p.progress);
    if (pct !== lastPct && pct % 10 === 0) { lastPct = pct; process.stderr.write(`\rDownloading model ${pct}%   `); }
  }
};

try {
  const client = await createKelados({ dtype: o.dtype, onProgress });
  process.stderr.write("\r");

  if (cmd === "voices") {
    for (const [id, v] of Object.entries(client.voices)) console.log(`${id.padEnd(14)} ${v.name.padEnd(10)} ${v.language}  ${v.gender.padEnd(6)}  grade ${v.overallGrade}`);
  } else if (cmd === "speak") {
    const text = o.file ? await readFile(o.file, "utf8") : rest.join(" ");
    if (!text.trim()) throw new Error("Nothing to say. Pass text or -f file.txt");
    const t0 = performance.now();
    const clip = await client.speak(text, { voice: o.voice, preset: o.preset, speed: o.speed && Number(o.speed) });
    await clip.save(o.out);
    console.log(`Saved ${o.out}: ${clip.duration.toFixed(1)}s of audio in ${((performance.now() - t0) / 1000).toFixed(1)}s`);
  } else if (cmd === "serve") {
    await serve(client, { port: Number(o.port), host: o.host, key: o.key });
    console.log(`Kelados server on http://${o.host}:${o.port}
  Speech      POST /v1/audio/speech            { "input": "...", "voice": "af_heart" }
  TTS         POST /v1/text-to-speech/:voice   { "text": "..." }
  Voices      GET  /v1/voices`);
  } else {
    console.log(HELP); process.exit(1);
  }
} catch (e) {
  console.error(`\nError: ${e.message}`);
  process.exit(1);
}

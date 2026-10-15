<p align="center">
  <img src="./.github/banner.png" alt="Kelados: speak, it's written" width="100%" />
</p>

<h1 align="center">Kelados</h1>

<p align="center">
  <strong>Free, private voice AI that runs on your own device.</strong><br />
  Dictate into any app, take live meeting notes, and turn text into natural speech, with no limits and no uploads.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/kelados"><img src="https://img.shields.io/npm/v/kelados?color=f2b45a&label=npm" alt="npm version" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-ededef" alt="MIT license" /></a>
  <img src="https://img.shields.io/badge/voices-28-8fb4ff" alt="28 voices" />
  <img src="https://img.shields.io/badge/server%20cost-%240-6ee7a8" alt="$0 server cost" />
</p>

<p align="center">
  <a href="#features">Features</a> ·
  <a href="#how-it-works">How it works</a> ·
  <a href="#quick-start">Quick start</a> ·
  <a href="#use-it-in-your-project">SDK & API</a> ·
  <a href="#self-hosting">Self-hosting</a> ·
  <a href="./DEPLOYMENT.md">Deployment</a>
</p>

---

## Why Kelados?

Hosted voice platforms charge per character because **their** GPUs generate every second of audio. Kelados moves that work onto the device that needs the audio: the visitor's browser, your laptop or your own server. Running it costs nobody anything, which makes it:

- **Unlimited.** No credits, quotas or character caps.
- **Private.** Text and audio never leave the machine that generates them.
- **Free to operate.** The hosted platform runs entirely on free tiers.
- **Open.** MIT-licensed code with Apache-2.0 model weights. Fork it, self-host it, ship it.

## Features

| | |
|---|---|
| **Dictation** | Talk and get clean text in real time. Filler words vanish, spoken commands work ("new line", "bullet point", "question mark"), "scratch that" and "4pm, no wait, 5pm" are understood, and snippets and a personal dictionary expand as you speak. |
| **Notetaker** | Live meeting transcripts with you and the other participants labelled separately (mic + shared tab audio), then highlights, action items, decisions and open questions. Export to Markdown, TXT or SRT. No bot joins your call. |
| **Desktop app** | One shortcut (Ctrl+Shift+Space) types what you say into any app: Slack, VS Code, Word, terminals, Claude Code. |
| **Integrations** | A Chrome extension for Google Docs, Gmail and any web text box; a Microsoft Word add-in; an MCP server so Claude Code can speak. |
| **Speech Studio** | Turn anything from a sentence to a novel into natural speech. Playback starts while the rest is still generating, with speed control, history and WAV export. |
| **Long-form Projects** | Multi-voice audiobooks, podcasts and voiceovers, mastered to a single file. |
| **Transcribe files** | Whisper in the browser: 99 languages, translation to English, SRT/VTT subtitles, with results streaming in as they are ready. |
| **Voice Library** | 28 American and British English voices with instant previews. |
| **Developer Platform** | A Node SDK, a CLI (`kelados say`, `kelados mcp`), a drop-in compatible self-hosted server, API keys and a usage dashboard. |

All cleanup and summaries are rule-based (no language model): instant, offline, predictable, and nothing is ever invented.

## How it works

```
┌──────────────────────────────┐        ┌────────────────────────────┐
│  Browser / your server       │        │  Kelados API (optional)    │
│                              │        │  Express + MongoDB         │
│  Kokoro-82M (ONNX)           │ counts │                            │
│  WebGPU · WASM · CPU         │───────▶│  accounts · API keys       │
│                              │        │  projects · presets        │
│  text ──▶ audio, locally     │◀───────│  lexicon · usage stats     │
└──────────────┬───────────────┘ sync   └────────────────────────────┘
               │ model weights (once, then cached)
        ┌──────┴───────┐
        │ Public CDNs  │  Hugging Face · jsDelivr
        └──────────────┘
```

- **Synthesis** uses [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M), a compact, high-quality TTS model, run with [transformers.js](https://github.com/huggingface/transformers.js) in a Web Worker (WebGPU when available, WASM otherwise) or on CPU in Node.
- **Live speech recognition** uses [Moonshine](https://huggingface.co/onnx-community/moonshine-base-ONNX) (English, built for real time) or Whisper, behind an energy-based voice-activity detector in an AudioWorklet. Each phrase is transcribed as soon as you pause, with previews while you talk. File transcription uses Whisper, split at silences so results stream in.
- **Speed:** models are warmed up on load (WebGPU shader compilation happens before your first word), cached persistently, and the site is cross-origin isolated so the WASM fallback runs multi-threaded.
- **The API** never receives text or audio. It stores only optional account data and per-day character counts.

## Repository structure

```
kelados/
├── frontend/                 Next.js 16 · TypeScript · Tailwind CSS v4 (static export)
│   ├── public/workers/       tts.js (Kokoro) · stt.js (Moonshine / Whisper) Web Workers
│   ├── src/app/(site)/       website pages: dictate, notes, studio, transcribe, projects, voices, …
│   ├── src/app/(embed)/      bare pages hosted by integrations: desktop overlay, extension popup, Word pane
│   ├── src/lib/engine/       model clients: tts.ts · stt.ts · live.ts (mic → VAD → STT)
│   ├── src/lib/speech/       vad, cleanup rules, summaries, dictation hook, settings, snippets
│   └── test/                 node --test suites for the pure speech logic
├── backend/                  Node.js · Express 5 · MongoDB
│   └── src/
│       ├── app.js            Express app (middleware + routes)
│       ├── index.js          serverless entry · server.js: local listener
│       ├── config/           env, database connection
│       ├── models/           one Mongoose model per file
│       ├── controllers/      request handlers per resource
│       ├── routes/           routers per resource, mounted in routes/index.js
│       ├── middleware/       auth, rate limit, errors
│       ├── validators/       zod schemas
│       └── utils/            HttpError, helpers, password + API-key crypto
├── sdk/                      "kelados" npm package: SDK, CLI, drop-in server, MCP server
├── desktop/                  Electron tray app: global shortcut dictation into any app
└── integrations/             Chrome extension · Word add-in and Claude Code setup
```

## Quick start

**Prerequisites:** Node.js 20+ and a MongoDB connection string (local, or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster).

```bash
git clone https://github.com/LovekeshAnand/Kelados.git
cd kelados

# 1. API
cd backend
cp .env.example .env          # set MONGODB_URI and JWT_SECRET
npm install
npm run dev                   # http://localhost:4000

# 2. Web app (new terminal)
cd frontend
cp .env.example .env.local    # NEXT_PUBLIC_API_URL=http://localhost:4000
npm install
npm run dev                   # http://localhost:3000
```

The studio, voice library and transcription work without the API. Accounts, projects, presets, rules and API keys need it.

### Environment variables

| Package | Variable | Description |
|---|---|---|
| backend | `MONGODB_URI` | MongoDB connection string |
| backend | `JWT_SECRET` | Random string of 32+ characters used to sign sessions |
| backend | `CORS_ORIGINS` | Comma-separated list of allowed web origins (default `*`) |
| frontend | `NEXT_PUBLIC_API_URL` | Public URL of the Kelados API |

## Use it in your project

### Node SDK

```bash
npm install kelados
```

```js
import { createKelados } from "kelados";

const tts = await createKelados();                       // runs locally
const clip = await tts.speak("Hello from Kelados!", { voice: "af_heart" });
await clip.save("hello.wav");
```

### CLI

```bash
npx kelados speak "The quick brown fox" -v am_fenrir -o fox.wav
npx kelados speak -f chapter-01.txt -v bf_emma -o chapter-01.wav
npx kelados voices
npx kelados say "Build finished"          # speak out loud
```

### Claude Code and other agents (MCP)

```bash
claude mcp add kelados -- npx -y kelados mcp
```

Claude can then speak through the `speak`, `save_speech` and `list_voices` tools. To dictate prompts into the terminal, use the [desktop app](./desktop).

### Drop-in API server

Run a local server that accepts the two most widely used TTS request formats, then point your existing client at it:

```bash
npx kelados serve --port 8880 --key my-secret
```

```bash
curl http://localhost:8880/v1/audio/speech   -H "Authorization: Bearer my-secret" -H "Content-Type: application/json"   -d '{"model": "tts-1", "voice": "nova", "input": "Same code, no bill."}' -o out.wav
```

See the [SDK documentation](./sdk/README.md) for the full API reference.

### API keys

Create keys in the web console (**Console → API keys**). A key lets the SDK sync your presets and pronunciation rules and log usage to your dashboard. Synthesis still runs on your machine. Keys are stored as SHA-256 hashes and shown only once.

## REST API

All endpoints accept `Authorization: Bearer <session-or-api-key>` or `x-api-key: kel_…`.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` · `/api/auth/login` | Create an account / sign in |
| `GET` | `/api/v1/workspace` | Presets, lexicon and snippets (used by the SDK and apps) |
| `GET` `POST` | `/api/projects` | List / create projects |
| `GET` `PUT` `DELETE` | `/api/projects/:id` | Read, replace or delete a project |
| `GET` `POST` · `PUT` `DELETE` | `/api/presets` · `/api/presets/:id` | Manage voice presets |
| `GET` `PUT` | `/api/lexicon` | Read / replace pronunciation rules |
| `GET` `PUT` | `/api/snippets` | Read / replace dictation snippets and personal dictionary |
| `POST` · `GET` | `/api/usage` | Report / read usage |
| `GET` `POST` `DELETE` | `/api/keys` | Manage API keys (web session only) |
| `GET` | `/api/stats` · `/api/health` | Public counters / health check |

## Self-hosting

The reference deployment costs **$0/month**:

| Component | Host | Plan |
|---|---|---|
| Web app | Cloudflare Pages | Free |
| API | Vercel | Hobby (free) |
| Database | MongoDB Atlas | M0 (free) |
| Model weights | Hugging Face / jsDelivr CDNs | Public |

Step-by-step instructions are in **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

## Development

```bash
cd backend  && npm test           # API unit + route wiring tests
cd sdk      && npm test           # SDK, CLI and MCP tests
cd frontend && npm test && npm run lint && npm run build   # speech logic tests; NEXT_BUILD_CPUS=2 on low-memory machines
cd desktop  && npm test && npm run smoke
```

Push a `v*` tag to build desktop installers for Windows and Linux (macOS once notarized) plus the Chrome extension zip
(`.github/workflows/release.yml`).

## Roadmap

- [ ] More languages (Kokoro supports Spanish, French, Hindi, Italian, Japanese, Portuguese and Chinese voices)
- [ ] Voice blending
- [ ] MP3 / Opus export
- [ ] Python SDK

## Acknowledgements

- [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) by hexgrad (Apache-2.0)
- [kokoro-js](https://www.npmjs.com/package/kokoro-js) and [transformers.js](https://github.com/huggingface/transformers.js) by Hugging Face
- [Whisper](https://github.com/openai/whisper) by OpenAI (MIT)
- [Moonshine](https://github.com/usefulsensors/moonshine) by Useful Sensors (MIT)

## License

Kelados is released under the [MIT License](./LICENSE). Generated audio belongs to you.

<p align="center"><sub><em>κέλαδος</em> (Greek): the sound of many voices.</sub></p>

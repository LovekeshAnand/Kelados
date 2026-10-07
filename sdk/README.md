<p align="center">
  <img src="https://raw.githubusercontent.com/your-org/kelados/main/.github/banner.png" alt="Kelados" width="100%" />
</p>

<h1 align="center">kelados</h1>

<p align="center">
  <strong>Free, unlimited text-to-speech for Node.js, running entirely on your own machine.</strong><br />
  SDK · CLI · drop-in compatible local server
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/kelados"><img src="https://img.shields.io/npm/v/kelados?color=f2b45a" alt="npm version" /></a>
  <img src="https://img.shields.io/node/v/kelados" alt="node version" />
  <img src="https://img.shields.io/npm/l/kelados" alt="license" />
</p>

---

`kelados` generates natural speech locally with the [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) model. There are no API calls to a voice vendor, no per-character billing and no usage limits. The model (~90 MB) downloads once on first use and is cached.

- **28 voices**, American and British English
- **Any length**: long text is split into sentences and streamed
- **Drop-in server** compatible with the common `audio/speech` and `text-to-speech` API formats
- **Optional workspace sync** that pulls voice presets and pronunciation rules from your Kelados account
- **Zero native dependencies** to compile, so it runs anywhere Node 20+ runs

## Installation

```bash
npm install kelados
```

## Quick start

```js
import { createKelados } from "kelados";

const tts = await createKelados();

const clip = await tts.speak("Hello! This audio was generated on my own machine.", {
  voice: "af_heart",
  speed: 1.0,
});

await clip.save("hello.wav");
console.log(`${clip.duration.toFixed(1)} seconds of audio`);
```

## API

### `createKelados(options?)`

Loads the model and returns a client. Call it once and reuse the client.

| Option | Type | Default | Description |
|---|---|---|---|
| `apiKey` | `string` | `process.env.KELADOS_API_KEY` | Optional. Syncs presets and pronunciation rules and reports usage. |
| `baseUrl` | `string` | `process.env.KELADOS_API_URL` | Kelados API URL (for self-hosted instances). |
| `dtype` | `"q8" \| "fp32" \| "fp16" \| "q4" \| "q4f16"` | `"q8"` | Model precision. `q8` is the best balance of speed and size on CPU. |
| `device` | `"cpu" \| "wasm" \| "webgpu"` | `"cpu"` | Execution backend. |
| `onProgress` | `(p) => void` | none | Model download progress callback. |

### `client.speak(text, options?)` → `Promise<Clip>`

Synthesizes text of any length into a single clip.

| Option | Type | Description |
|---|---|---|
| `voice` | `string` | Voice ID, e.g. `"af_heart"` (default). |
| `preset` | `string` | Name or ID of a preset in your workspace (requires `apiKey`). |
| `speed` | `number` | `0.5` to `2.0`. Default `1.0`. |

A `Clip` exposes:

| Member | Description |
|---|---|
| `audio` | `Float32Array` of mono samples |
| `sampleRate` | Sample rate in Hz (24000) |
| `duration` | Length in seconds |
| `toWav()` | Returns a 16-bit PCM WAV `Buffer` |
| `save(path)` | Writes a WAV file |

### `client.stream(text, options?)` → `AsyncGenerator`

Yields audio sentence by sentence, so playback can begin before the whole text is generated.

```js
for await (const { text, audio, sampleRate } of tts.stream(longChapter, { voice: "bm_george" })) {
  player.enqueue(audio, sampleRate);
}
```

### `client.voices`

A record of every available voice with its name, language, gender and quality grade.

### Helpers

```js
import { encodeWav, applyLexicon } from "kelados";

encodeWav(float32Samples, 24000);                            // → Buffer
applyLexicon("Kelados is fast", [{ from: "Kelados", to: "keh-lah-dos" }]);
```

## CLI

```bash
npx kelados speak "The quick brown fox jumps over the lazy dog" -v am_fenrir -o fox.wav
npx kelados speak -f chapter-01.txt -v bf_emma -s 0.95 -o chapter-01.wav
npx kelados speak "Using my saved preset" -p Narrator          # needs KELADOS_API_KEY
npx kelados voices
npx kelados serve --port 8880 --key my-secret
```

| Flag | Description |
|---|---|
| `-v, --voice` | Voice ID |
| `-p, --preset` | Preset name from your workspace |
| `-s, --speed` | Speed, `0.5` to `2.0` |
| `-f, --file` | Read text from a file |
| `-o, --out` | Output WAV path (default `speech.wav`) |
| `--dtype` | Model precision (default `q8`) |
| `--port`, `--host` | Server bind address (default `127.0.0.1:8880`) |
| `--key` | Require this bearer key on the server |

## Drop-in API server

`kelados serve` exposes the two most widely used TTS API formats. Point an existing client at it and it works unchanged.

### `audio/speech` format

```bash
curl http://localhost:8880/v1/audio/speech \
  -H "Authorization: Bearer my-secret" \
  -H "Content-Type: application/json" \
  -d '{"model": "tts-1", "input": "Hello world", "voice": "nova"}' \
  -o out.wav
```

Common voice names (`alloy`, `ash`, `ballad`, `coral`, `echo`, `fable`, `nova`, `onyx`, `sage`, `shimmer`, `verse`) map to the closest Kokoro voice. Kokoro voice IDs are accepted as well.

### `text-to-speech` format

```bash
curl http://localhost:8880/v1/text-to-speech/af_bella \
  -H "xi-api-key: my-secret" \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world", "voice_settings": {"speed": 1.1}}' \
  -o out.wav
```

### Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/v1/audio/speech` | Synthesis (`audio/speech` format) |
| `POST` | `/v1/text-to-speech/:voice_id` | Synthesis (`text-to-speech` format) |
| `GET` | `/v1/voices` | List voices |
| `GET` | `/v1/models` | List models |
| `GET` | `/health` | Health check (no auth) |

Responses are `audio/wav`. Request `response_format: "pcm"` (`audio/speech`) or `output_format=pcm_24000` (`text-to-speech`) for raw 16-bit PCM. Requests are processed one at a time per server process.

## Voices

| ID | Name | Accent | Gender | Grade |
|---|---|---|---|---|
| `af_heart` | Heart | American | Female | A |
| `af_bella` | Bella | American | Female | A- |
| `af_nicole` | Nicole | American | Female | B- |
| `bf_emma` | Emma | British | Female | B- |
| `af_aoede` · `af_kore` · `af_sarah` | Aoede · Kore · Sarah | American | Female | C+ |
| `am_fenrir` · `am_michael` · `am_puck` | Fenrir · Michael · Puck | American | Male | C+ |
| `bm_george` · `bm_fable` | George · Fable | British | Male | C |

Run `npx kelados voices` for the full list of 28.

## Workspace sync (optional)

With an API key from your Kelados console, the client:

1. Downloads your **voice presets**, so you can use `speak(text, { preset: "Narrator" })`.
2. Applies your **pronunciation rules** to every request.
3. Reports **character counts**, never text or audio, to your usage dashboard.

```bash
export KELADOS_API_KEY=kel_xxxxxxxxxxxxxxxxxxxx
```

## Requirements

- Node.js 20 or later
- ~90 MB of disk for the cached model (`q8`)
- Any modern x64 or ARM64 CPU. A typical laptop generates audio faster than real time.

## License

MIT. Voice model: Kokoro-82M, Apache-2.0. Audio you generate is yours to use, including commercially.

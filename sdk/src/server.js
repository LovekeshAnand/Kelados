import http from "node:http";

// Common TTS voice names → closest Kokoro voice, so existing client code works unchanged.
const COMPAT_VOICES = { alloy: "af_alloy", echo: "am_echo", fable: "bm_fable", onyx: "am_onyx", nova: "af_nova", shimmer: "af_bella",
  ash: "am_michael", ballad: "bm_george", coral: "af_heart", sage: "af_sarah", verse: "am_puck" };
const MAX_CHARS = 100_000;

/** Start a local drop-in compatible TTS server backed by a Kelados client. */
export function serve(client, { port = 8880, host = "127.0.0.1", key } = {}) {
  let queue = Promise.resolve(); // the ONNX session is not re-entrant; run one synthesis at a time
  const synth = (text, opts) => (queue = queue.then(() => client.speak(text, opts), () => client.speak(text, opts)));

  const send = (res, status, body, type = "application/json") => {
    res.writeHead(status, { "content-type": type, "access-control-allow-origin": "*" });
    res.end(type === "application/json" ? JSON.stringify(body) : body);
  };
  const readJson = (req) => new Promise((ok, fail) => {
    let s = "";
    req.on("data", (d) => { s += d; if (s.length > MAX_CHARS * 4) req.destroy(); });
    req.on("end", () => { try { ok(JSON.parse(s || "{}")); } catch { fail(Object.assign(new Error("Invalid JSON body"), { status: 400 })); } });
    req.on("error", fail);
  });
  const audio = (res, clip, format) => format === "pcm"
    ? send(res, 200, Buffer.from(Int16Array.from(clip.audio, (v) => Math.max(-1, Math.min(1, v)) * 32767).buffer), "audio/pcm")
    : send(res, 200, clip.toWav(), "audio/wav");

  const server = http.createServer(async (req, res) => {
    try {
      if (req.method === "OPTIONS") {
        res.writeHead(204, { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "GET,POST" });
        return res.end();
      }
      const url = new URL(req.url, "http://x");
      if (url.pathname === "/health") return send(res, 200, { ok: true });

      if (key) {
        const given = (req.headers.authorization || "").replace(/^Bearer\s+/i, "") || req.headers["xi-api-key"] || req.headers["x-api-key"];
        if (given !== key) return send(res, 401, { error: "Unauthorized" });
      }

      if (req.method === "GET" && url.pathname === "/v1/voices") {
        const voices = Object.entries(client.voices).map(([id, v]) => ({ voice_id: id, name: v.name, labels: { language: v.language, gender: v.gender, grade: v.overallGrade } }));
        return send(res, 200, { voices });
      }
      if (req.method === "GET" && url.pathname === "/v1/models") {
        return send(res, 200, { object: "list", data: [{ id: "kokoro", object: "model", owned_by: "kelados" }, { id: "tts-1", object: "model", owned_by: "kelados" }] });
      }

      // POST /v1/audio/speech { input, voice, speed, response_format }
      if (req.method === "POST" && url.pathname === "/v1/audio/speech") {
        const b = await readJson(req);
        if (typeof b.input !== "string" || !b.input.trim()) return send(res, 400, { error: "`input` is required" });
        if (b.input.length > MAX_CHARS) return send(res, 413, { error: `input over ${MAX_CHARS} chars` });
        const voice = COMPAT_VOICES[b.voice] || b.voice || "af_heart";
        return audio(res, await synth(b.input, { voice, speed: b.speed }), b.response_format);
      }

      // POST /v1/text-to-speech/:voice_id { text, voice_settings: { speed } }
      const el = url.pathname.match(/^\/v1\/text-to-speech\/([\w-]+)(\/stream)?$/);
      if (req.method === "POST" && el) {
        const b = await readJson(req);
        if (typeof b.text !== "string" || !b.text.trim()) return send(res, 400, { error: "`text` is required" });
        if (b.text.length > MAX_CHARS) return send(res, 413, { error: `text over ${MAX_CHARS} chars` });
        return audio(res, await synth(b.text, { voice: el[1], speed: b.voice_settings?.speed }), url.searchParams.get("output_format")?.startsWith("pcm") ? "pcm" : "wav");
      }

      send(res, 404, { error: "Not found" });
    } catch (e) {
      send(res, e.status || (/Unknown (voice|preset)/.test(e.message) ? 400 : 500), { error: e.message });
    }
  });
  return new Promise((ok) => server.listen(port, host, () => ok(server)));
}

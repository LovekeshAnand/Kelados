// Minimal MCP server over stdio (newline-delimited JSON-RPC 2.0), so agents like Claude Code can speak.
// Add it with: claude mcp add kelados -- npx -y kelados mcp
import { createInterface } from "node:readline";
import { createRequire } from "node:module";
import { playWav } from "./play.js";

const { version } = createRequire(import.meta.url)("../package.json");

export const TOOLS = [
  {
    name: "speak",
    description: "Say text out loud on the user's speakers with a natural voice. Use it when the user asks you to talk, read something aloud, or announce that a long task is done. Keep it short and conversational.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "What to say. Plain sentences; no markdown or code." },
        voice: { type: "string", description: "Voice id, e.g. af_heart (default), bm_george, am_michael. See list_voices." },
        speed: { type: "number", minimum: 0.5, maximum: 2, description: "Speaking rate, default 1." },
      },
      required: ["text"],
    },
  },
  {
    name: "save_speech",
    description: "Generate speech and save it as a WAV file instead of playing it.",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string" }, path: { type: "string", description: "Output .wav path" }, voice: { type: "string" }, speed: { type: "number" } },
      required: ["text", "path"],
    },
  },
  { name: "list_voices", description: "List the available voice ids.", inputSchema: { type: "object", properties: {} } },
];

/** Handle one JSON-RPC message; returns the response object, or null for notifications. */
export async function handle(msg, getClient) {
  const reply = (result) => ({ jsonrpc: "2.0", id: msg.id, result });
  const fail = (code, message) => ({ jsonrpc: "2.0", id: msg.id, error: { code, message } });
  if (msg.id === undefined) return null; // notification, e.g. notifications/initialized

  switch (msg.method) {
    case "initialize":
      return reply({
        protocolVersion: msg.params?.protocolVersion ?? "2025-06-18",
        capabilities: { tools: {} },
        serverInfo: { name: "kelados", version },
        instructions: "Kelados speaks text aloud locally. Use `speak` only when the user wants audio.",
      });
    case "ping":
      return reply({});
    case "tools/list":
      return reply({ tools: TOOLS });
    case "tools/call": {
      const { name, arguments: a = {} } = msg.params ?? {};
      try {
        const client = await getClient();
        if (name === "list_voices") return reply({ content: [{ type: "text", text: Object.entries(client.voices).map(([id, v]) => `${id} (${v.name}, ${v.gender})`).join("\n") }] });
        if (name !== "speak" && name !== "save_speech") return fail(-32602, `Unknown tool ${name}`);
        if (!a.text?.trim()) throw new Error("text is required");
        const clip = await client.speak(a.text, { voice: a.voice, speed: a.speed });
        if (name === "save_speech") { await clip.save(a.path); return reply({ content: [{ type: "text", text: `Saved ${clip.duration.toFixed(1)}s to ${a.path}` }] }); }
        await playWav(clip.toWav());
        return reply({ content: [{ type: "text", text: `Spoke ${clip.duration.toFixed(1)}s of audio.` }] });
      } catch (e) {
        return reply({ content: [{ type: "text", text: `Kelados error: ${e.message}` }], isError: true });
      }
    }
    default:
      return fail(-32601, `Method not found: ${msg.method}`);
  }
}

/** Run over stdin/stdout. The model loads on the first tool call so the handshake stays instant. */
export function runMcp(createClient) {
  // stdout is the protocol channel; anything a dependency prints must go to stderr.
  console.log = console.error;
  let client;
  const getClient = () => (client ??= createClient().catch((e) => { client = undefined; throw e; }));
  const out = (m) => process.stdout.write(JSON.stringify(m) + "\n");
  const rl = createInterface({ input: process.stdin });
  rl.on("line", async (line) => {
    if (!line.trim()) return;
    let msg;
    try { msg = JSON.parse(line); } catch { return out({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }); }
    const res = await handle(msg, getClient);
    if (res) out(res);
  });
  return rl;
}

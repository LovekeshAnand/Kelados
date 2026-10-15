import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { handle } from "../src/mcp.js";
import { playerFor } from "../src/play.js";

test("MCP handshake and tool listing over stdio, without loading the model", async () => {
  const bin = fileURLToPath(new URL("../bin/kelados.js", import.meta.url));
  const p = spawn(process.execPath, [bin, "mcp"], { stdio: ["pipe", "pipe", "inherit"] });
  const lines = [];
  p.stdout.setEncoding("utf8").on("data", (d) => lines.push(...d.split("\n").filter(Boolean)));
  const send = (m) => p.stdin.write(JSON.stringify(m) + "\n");
  send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "0" } } });
  send({ jsonrpc: "2.0", method: "notifications/initialized" });
  send({ jsonrpc: "2.0", id: 2, method: "tools/list" });
  for (let i = 0; i < 100 && lines.length < 2; i++) await new Promise((r) => setTimeout(r, 50));
  p.kill();
  const [init, list] = lines.map((l) => JSON.parse(l));
  assert.equal(init.result.serverInfo.name, "kelados");
  assert.deepEqual(list.result.tools.map((t) => t.name), ["speak", "save_speech", "list_voices"]);
});

test("tool errors are reported to the agent, unknown methods are JSON-RPC errors", async () => {
  const client = async () => ({ voices: {}, speak: async () => { throw new Error("boom"); } });
  const r = await handle({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "speak", arguments: { text: "hi" } } }, client);
  assert.equal(r.result.isError, true);
  assert.match(r.result.content[0].text, /boom/);
  assert.equal((await handle({ jsonrpc: "2.0", id: 4, method: "nope" }, client)).error.code, -32601);
  assert.equal(await handle({ jsonrpc: "2.0", method: "notifications/initialized" }, client), null);
});

test("player commands quote paths safely", () => {
  assert.deepEqual(playerFor("darwin", "/tmp/a b.wav"), ["afplay", ["/tmp/a b.wav"]]);
  assert.match(playerFor("win32", "C:\\it's.wav")[1][2], /'C:\\it''s\.wav'/);
});

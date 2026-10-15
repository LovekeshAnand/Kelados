import { test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

// Route wiring only: no database. Every check below fails before a query would run.
process.env.MONGODB_URI = "mongodb://stub";
mongoose.connect = async () => {};
const { createApp } = await import("../src/app.js");

test("routes are mounted, protected, and validated", async (t) => {
  const server = createApp().listen(0);
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = (method, path, body) => fetch(base + path, {
    method, headers: { "content-type": "application/json" }, body: body && JSON.stringify(body),
  }).then((r) => r.status);

  assert.equal(await call("GET", "/health"), 200);
  assert.equal(await call("GET", "/nope"), 404);
  assert.equal(await call("POST", "/auth/register", { email: "bad" }), 400);
  for (const [method, path] of [
    ["GET", "/auth/me"], ["GET", "/keys"], ["DELETE", "/keys/x"], ["GET", "/projects"], ["PUT", "/projects/x"],
    ["GET", "/presets"], ["GET", "/lexicon"], ["PUT", "/snippets"], ["POST", "/usage"], ["GET", "/v1/workspace"],
  ]) assert.equal(await call(method, path), 401, `${method} ${path}`);
});

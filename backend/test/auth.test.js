import { test } from "node:test";
import assert from "node:assert/strict";
import { newApiKey, sha256, KEY_PREFIX, hashPassword, verifyPassword } from "../src/auth.js";

test("api keys are prefixed, unique, and only their hash is kept", () => {
  const a = newApiKey(), b = newApiKey();
  assert.ok(a.plain.startsWith(KEY_PREFIX));
  assert.notEqual(a.plain, b.plain);
  assert.equal(a.hash, sha256(a.plain));
  assert.notEqual(a.hash, a.plain);
  assert.equal(a.prefix, a.plain.slice(0, 10));
});

test("passwords hash with a random salt and verify", async () => {
  const h = await hashPassword("correct horse");
  assert.notEqual(h, await hashPassword("correct horse"));
  assert.equal(await verifyPassword("correct horse", h), true);
  assert.equal(await verifyPassword("wrong horse", h), false);
});

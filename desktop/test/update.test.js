import { test } from "node:test";
import assert from "node:assert/strict";
import { isNewer } from "../update.js";

test("version comparison", () => {
  assert.ok(isNewer("v1.0.1", "1.0.0"));
  assert.ok(isNewer("1.10.0", "1.9.9"));
  assert.ok(isNewer("2.0.0", "1.99.0"));
  assert.ok(!isNewer("v1.0.0", "1.0.0"));
  assert.ok(!isNewer("0.9.0", "1.0.0"));
  assert.ok(!isNewer("v1.1.0-beta", "1.1.0"));
});

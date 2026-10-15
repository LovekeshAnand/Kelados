import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export const KEY_PREFIX = "kel_";

export const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");

export function newApiKey() {
  const plain = KEY_PREFIX + crypto.randomBytes(24).toString("base64url");
  return { plain, hash: sha256(plain), prefix: plain.slice(0, 10) };
}

function secret() {
  const s = env.jwtSecret;
  if (!s || s.length < 32) throw new Error("JWT_SECRET must be set (32+ chars)");
  return s;
}

// Native WebCrypto PBKDF2: same code on Node and Workers, and cheap on CPU-limited plans.
const ITERATIONS = 100_000;
async function pbkdf2(password, salt, iterations) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  return Buffer.from(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256));
}

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  return ["pbkdf2", ITERATIONS, salt.toString("base64"), (await pbkdf2(password, salt, ITERATIONS)).toString("base64")].join("$");
}

export async function verifyPassword(password, stored) {
  // Missing or foreign-format hashes (e.g. users created by another app on the same DB) are a failed login, not a crash.
  const [scheme, iters, salt, hash] = String(stored ?? "").split("$");
  if (scheme !== "pbkdf2" || !salt || !hash) return false;
  const actual = await pbkdf2(password, Buffer.from(salt, "base64"), Number(iters));
  const expected = Buffer.from(hash, "base64");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export const signToken = (userId) => jwt.sign({ sub: String(userId) }, secret(), { expiresIn: "30d" });
export const verifyToken = (token) => jwt.verify(token, secret());

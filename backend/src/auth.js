import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { ApiKey, User } from "./models.js";

export const KEY_PREFIX = "kel_";

export const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");

export function newApiKey() {
  const plain = KEY_PREFIX + crypto.randomBytes(24).toString("base64url");
  return { plain, hash: sha256(plain), prefix: plain.slice(0, 10) };
}

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) throw new Error("JWT_SECRET must be set (32+ chars)");
  return s;
}

// Native WebCrypto PBKDF2: same code on Node and Workers, and cheap on CPU-limited Workers plans.
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

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// Accepts `Authorization: Bearer <jwt>` (web app) or `Bearer kel_...` / `x-api-key` (SDK).
// Sets req.userId and req.via = "jwt" | "key".
export async function authenticate(req) {
  const header = req.get("authorization") || "";
  const token = req.get("x-api-key") || (header.startsWith("Bearer ") ? header.slice(7).trim() : "");
  if (!token) throw new HttpError(401, "Missing credentials");

  if (token.startsWith(KEY_PREFIX)) {
    const key = await ApiKey.findOneAndUpdate({ hash: sha256(token) }, { lastUsedAt: new Date() });
    if (!key) throw new HttpError(401, "Invalid API key");
    req.userId = key.user;
    req.via = "key";
    return;
  }
  let payload;
  try { payload = jwt.verify(token, secret()); } catch { throw new HttpError(401, "Invalid or expired session"); }
  if (!(await User.exists({ _id: payload.sub }))) throw new HttpError(401, "Account no longer exists");
  req.userId = payload.sub;
  req.via = "jwt";
}

export const requireAuth = (via) => async (req, _res, next) => {
  await authenticate(req);
  if (via && req.via !== via) throw new HttpError(403, via === "jwt" ? "Sign in on the web app for this action" : "API key required");
  next();
};

// ponytail: per-instance in-memory limiter; add a Vercel Firewall rate-limit rule on /api/auth/* if abused.
const hits = new Map();
export function rateLimit(max, windowMs) {
  return (req, _res, next) => {
    const id = `${req.path}:${req.get("cf-connecting-ip") || req.ip}`;
    const now = Date.now();
    const h = hits.get(id);
    if (!h || now > h.reset) hits.set(id, { n: 1, reset: now + windowMs });
    else if (++h.n > max) throw new HttpError(429, "Too many attempts, try again shortly");
    if (hits.size > 10000) hits.clear();
    next();
  };
}

import { ApiKey, User } from "../models/index.js";
import { HttpError } from "../utils/HttpError.js";
import { KEY_PREFIX, sha256, verifyToken } from "../utils/security.js";

// Accepts `Authorization: Bearer <jwt>` (web app) or `Bearer kel_...` / `x-api-key` (SDK, desktop, extensions).
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
  try { payload = verifyToken(token); } catch { throw new HttpError(401, "Invalid or expired session"); }
  if (!(await User.exists({ _id: payload.sub }))) throw new HttpError(401, "Account no longer exists");
  req.userId = payload.sub;
  req.via = "jwt";
}

/** `requireAuth()` accepts either credential; `requireAuth("jwt")` is for web-only actions like key management. */
export const requireAuth = (via) => async (req, _res, next) => {
  await authenticate(req);
  if (via && req.via !== via) throw new HttpError(403, via === "jwt" ? "Sign in on the web app for this action" : "API key required");
  next();
};

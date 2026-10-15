import { HttpError } from "../utils/HttpError.js";

// ponytail: per-instance in-memory limiter; add a platform firewall rate-limit rule on /api/auth/* if abused.
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

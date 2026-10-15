import { Stats, Usage, User } from "../models/index.js";
import { parse, today } from "../utils/helpers.js";
import * as schema from "../validators/schemas.js";

// Usage is reported by clients; synthesis and transcription never touch this server.
export async function report(req, res) {
  const body = parse(schema.usage(req.via), req.body);
  const inc = { characters: body.characters, seconds: body.seconds, generations: 1 };
  await Promise.all([
    Usage.updateOne({ user: req.userId, day: today(), source: body.source }, { $inc: inc }, { upsert: true }),
    Stats.updateOne({ _id: "global" }, { $inc: inc }, { upsert: true }),
  ]);
  res.status(202).json({ ok: true });
}

export async function history(req, res) {
  const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 365);
  const since = new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10);
  const rows = await Usage.find({ user: req.userId, day: { $gte: since } }).sort({ day: 1 }).lean();
  const totals = rows.reduce((t, r) => ({
    characters: t.characters + r.characters, seconds: t.seconds + r.seconds, generations: t.generations + r.generations,
  }), { characters: 0, seconds: 0, generations: 0 });
  res.json({ since, rows: rows.map(({ day, source, characters, seconds, generations }) => ({ day, source, characters, seconds, generations })), totals });
}

export async function publicStats(_req, res) {
  const [s, users] = await Promise.all([Stats.findById("global").lean(), User.estimatedDocumentCount()]);
  res.set("cache-control", "public, max-age=60");
  res.json({ characters: s?.characters ?? 0, seconds: s?.seconds ?? 0, generations: s?.generations ?? 0, users });
}

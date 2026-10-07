import express from "express";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
import { z } from "zod";
import { User, ApiKey, Project, Preset, Lexicon, Usage, Stats } from "./models.js";
import { HttpError, hashPassword, newApiKey, rateLimit, requireAuth, signToken, verifyPassword } from "./auth.js";

let connecting;
function connectDb() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
  // maxPoolSize 1 keeps serverless isolates (Workers) from exhausting Atlas M0's connection limit.
  connecting ??= mongoose.connect(process.env.MONGODB_URI, { maxPoolSize: 1, serverSelectionTimeoutMS: 8000 })
    .catch((e) => { connecting = undefined; throw e; });
  return connecting;
}

const parse = (schema, data) => {
  const r = schema.safeParse(data);
  if (!r.success) throw new HttpError(400, r.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; "));
  return r.data;
};
const objectId = (id) => {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(404, "Not found");
  return id;
};
const publicUser = (u) => ({ id: u._id, email: u.email, name: u.name, createdAt: u.createdAt });
const today = () => new Date().toISOString().slice(0, 10);

const voice = z.string().regex(/^[a-z]{2}_[a-z]+$/, "unknown voice id");
const speed = z.number().min(0.5).max(2);
const blockSchema = z.object({
  _id: z.string().optional(),
  text: z.string().max(20000),
  voice,
  speed: speed.default(1),
  pauseAfter: z.number().min(0).max(5).default(0.4),
});
const projectSchema = z.object({
  title: z.string().trim().min(1).max(140),
  kind: z.enum(["audiobook", "podcast", "voiceover", "other"]).default("other"),
  blocks: z.array(blockSchema).max(500).default([]),
});
const presetSchema = z.object({
  name: z.string().trim().min(1).max(60),
  voice,
  speed: speed.default(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#c6ff3d"),
});

export function createApp() {
  const app = express();
  const origins = (process.env.CORS_ORIGINS || "*").split(",").map((s) => s.trim().replace(/\/+$/, ""));

  app.set("trust proxy", true);
  app.use(helmet());
  app.use(cors({ origin: origins.includes("*") ? true : origins, maxAge: 86400 }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => res.json({ ok: true, service: "kelados", time: new Date().toISOString() }));

  app.use("/api", async (_req, _res, next) => { await connectDb(); next(); });

  // ---------- public ----------
  app.get("/api/stats", async (_req, res) => {
    const [s, users] = await Promise.all([Stats.findById("global").lean(), User.estimatedDocumentCount()]);
    res.set("cache-control", "public, max-age=60");
    res.json({ characters: s?.characters ?? 0, seconds: s?.seconds ?? 0, generations: s?.generations ?? 0, users });
  });

  // ---------- auth ----------
  const credentials = z.object({ email: z.email().max(200), password: z.string().min(8).max(200) });

  app.post("/api/auth/register", rateLimit(10, 15 * 60_000), async (req, res) => {
    const body = parse(credentials.extend({ name: z.string().trim().min(1).max(80) }), req.body);
    if (await User.exists({ email: body.email.toLowerCase() })) throw new HttpError(409, "An account with this email already exists");
    const user = await User.create({ email: body.email, name: body.name, passwordHash: await hashPassword(body.password) });
    res.status(201).json({ token: signToken(user._id), user: publicUser(user) });
  });

  app.post("/api/auth/login", rateLimit(20, 15 * 60_000), async (req, res) => {
    const body = parse(credentials, req.body);
    const user = await User.findOne({ email: body.email.toLowerCase() });
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) throw new HttpError(401, "Wrong email or password");
    res.json({ token: signToken(user._id), user: publicUser(user) });
  });

  app.get("/api/auth/me", requireAuth("jwt"), async (req, res) => {
    res.json({ user: publicUser(await User.findById(req.userId)) });
  });

  app.patch("/api/auth/me", requireAuth("jwt"), async (req, res) => {
    const body = parse(z.object({ name: z.string().trim().min(1).max(80) }), req.body);
    res.json({ user: publicUser(await User.findByIdAndUpdate(req.userId, body, { new: true })) });
  });

  app.delete("/api/auth/me", requireAuth("jwt"), async (req, res) => {
    const user = { user: req.userId };
    await Promise.all([ApiKey.deleteMany(user), Project.deleteMany(user), Preset.deleteMany(user), Lexicon.deleteMany(user), Usage.deleteMany(user)]);
    await User.findByIdAndDelete(req.userId);
    res.status(204).end();
  });

  // ---------- API keys (managed from the web app only) ----------
  app.get("/api/keys", requireAuth("jwt"), async (req, res) => {
    res.json({ keys: await ApiKey.find({ user: req.userId }).select("-hash").sort({ createdAt: -1 }).lean() });
  });

  app.post("/api/keys", requireAuth("jwt"), async (req, res) => {
    const { name } = parse(z.object({ name: z.string().trim().min(1).max(60) }), req.body);
    if ((await ApiKey.countDocuments({ user: req.userId })) >= 20) throw new HttpError(400, "Limit of 20 keys reached, revoke one first");
    const k = newApiKey();
    const doc = await ApiKey.create({ user: req.userId, name, prefix: k.prefix, hash: k.hash });
    res.status(201).json({ key: k.plain, id: doc._id, name, prefix: k.prefix, createdAt: doc.createdAt });
  });

  app.delete("/api/keys/:id", requireAuth("jwt"), async (req, res) => {
    const r = await ApiKey.deleteOne({ _id: objectId(req.params.id), user: req.userId });
    if (!r.deletedCount) throw new HttpError(404, "Not found");
    res.status(204).end();
  });

  // ---------- projects ----------
  app.get("/api/projects", requireAuth(), async (req, res) => {
    const projects = await Project.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(String(req.userId)) } },
      { $sort: { updatedAt: -1 } },
      { $project: { title: 1, kind: 1, createdAt: 1, updatedAt: 1, blockCount: { $size: "$blocks" },
        characters: { $sum: { $map: { input: "$blocks", in: { $strLenCP: "$$this.text" } } } } } },
    ]);
    res.json({ projects });
  });

  app.post("/api/projects", requireAuth(), async (req, res) => {
    if ((await Project.countDocuments({ user: req.userId })) >= 200) throw new HttpError(400, "Limit of 200 projects reached");
    res.status(201).json({ project: await Project.create({ ...parse(projectSchema, req.body), user: req.userId }) });
  });

  app.get("/api/projects/:id", requireAuth(), async (req, res) => {
    const project = await Project.findOne({ _id: objectId(req.params.id), user: req.userId }).lean();
    if (!project) throw new HttpError(404, "Not found");
    res.json({ project });
  });

  app.put("/api/projects/:id", requireAuth(), async (req, res) => {
    const project = await Project.findOneAndUpdate({ _id: objectId(req.params.id), user: req.userId },
      parse(projectSchema, req.body), { new: true, runValidators: true }).lean();
    if (!project) throw new HttpError(404, "Not found");
    res.json({ project });
  });

  app.delete("/api/projects/:id", requireAuth(), async (req, res) => {
    const r = await Project.deleteOne({ _id: objectId(req.params.id), user: req.userId });
    if (!r.deletedCount) throw new HttpError(404, "Not found");
    res.status(204).end();
  });

  // ---------- voice presets ----------
  app.get("/api/presets", requireAuth(), async (req, res) => {
    res.json({ presets: await Preset.find({ user: req.userId }).sort({ createdAt: 1 }).lean() });
  });

  app.post("/api/presets", requireAuth(), async (req, res) => {
    if ((await Preset.countDocuments({ user: req.userId })) >= 100) throw new HttpError(400, "Limit of 100 presets reached");
    res.status(201).json({ preset: await Preset.create({ ...parse(presetSchema, req.body), user: req.userId }) });
  });

  app.put("/api/presets/:id", requireAuth(), async (req, res) => {
    const preset = await Preset.findOneAndUpdate({ _id: objectId(req.params.id), user: req.userId },
      parse(presetSchema, req.body), { new: true }).lean();
    if (!preset) throw new HttpError(404, "Not found");
    res.json({ preset });
  });

  app.delete("/api/presets/:id", requireAuth(), async (req, res) => {
    const r = await Preset.deleteOne({ _id: objectId(req.params.id), user: req.userId });
    if (!r.deletedCount) throw new HttpError(404, "Not found");
    res.status(204).end();
  });

  // ---------- pronunciation lexicon ----------
  app.get("/api/lexicon", requireAuth(), async (req, res) => {
    res.json({ rules: (await Lexicon.findOne({ user: req.userId }).lean())?.rules ?? [] });
  });

  app.put("/api/lexicon", requireAuth(), async (req, res) => {
    const { rules } = parse(z.object({ rules: z.array(z.object({
      from: z.string().trim().min(1).max(100), to: z.string().trim().min(1).max(200),
    })).max(500) }), req.body);
    await Lexicon.updateOne({ user: req.userId }, { rules }, { upsert: true });
    res.json({ rules });
  });

  // ---------- workspace sync for the SDK (one call gets everything) ----------
  app.get("/api/v1/workspace", requireAuth(), async (req, res) => {
    const [user, presets, lexicon] = await Promise.all([
      User.findById(req.userId).lean(),
      Preset.find({ user: req.userId }).lean(),
      Lexicon.findOne({ user: req.userId }).lean(),
    ]);
    res.json({ user: { name: user.name }, presets, lexicon: lexicon?.rules ?? [] });
  });

  // ---------- usage (reported by clients; synthesis itself never touches this server) ----------
  app.post("/api/usage", requireAuth(), async (req, res) => {
    const body = parse(z.object({
      characters: z.number().int().min(0).max(1_000_000),
      seconds: z.number().min(0).max(36_000).default(0),
      source: z.enum(["web", "sdk", "server"]).default(req.via === "key" ? "sdk" : "web"),
    }), req.body);
    const inc = { characters: body.characters, seconds: body.seconds, generations: 1 };
    await Promise.all([
      Usage.updateOne({ user: req.userId, day: today(), source: body.source }, { $inc: inc }, { upsert: true }),
      Stats.updateOne({ _id: "global" }, { $inc: inc }, { upsert: true }),
    ]);
    res.status(202).json({ ok: true });
  });

  app.get("/api/usage", requireAuth(), async (req, res) => {
    const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 365);
    const since = new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10);
    const rows = await Usage.find({ user: req.userId, day: { $gte: since } }).sort({ day: 1 }).lean();
    const totals = rows.reduce((t, r) => ({
      characters: t.characters + r.characters, seconds: t.seconds + r.seconds, generations: t.generations + r.generations,
    }), { characters: 0, seconds: 0, generations: 0 });
    res.json({ since, rows: rows.map(({ day, source, characters, seconds, generations }) => ({ day, source, characters, seconds, generations })), totals });
  });

  app.use("/api", (_req, _res, next) => next(new HttpError(404, "Not found")));

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    const status = err.status || (err.type === "entity.parse.failed" ? 400 : 500);
    if (status >= 500) console.error(err);
    res.status(status).json({ error: status >= 500 ? "Internal server error" : err.message });
  });

  return app;
}

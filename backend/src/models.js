import mongoose from "mongoose";

const { Schema, model, models } = mongoose;
const opts = { timestamps: true, versionKey: false };

const User = models.User || model("User", new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  passwordHash: { type: String, required: true },
}, opts));

// Only the sha256 of a key is stored; the plaintext is shown once at creation.
const ApiKey = models.ApiKey || model("ApiKey", new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: { type: String, required: true, maxlength: 60 },
  prefix: { type: String, required: true },
  hash: { type: String, required: true, unique: true },
  lastUsedAt: Date,
}, opts));

const block = new Schema({
  text: { type: String, default: "", maxlength: 20000 },
  voice: { type: String, default: "af_heart" },
  speed: { type: Number, default: 1, min: 0.5, max: 2 },
  pauseAfter: { type: Number, default: 0.4, min: 0, max: 5 },
}, { _id: true });

const Project = models.Project || model("Project", new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, maxlength: 140 },
  kind: { type: String, enum: ["audiobook", "podcast", "voiceover", "other"], default: "other" },
  blocks: { type: [block], default: [] },
}, opts));

const Preset = models.Preset || model("Preset", new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: { type: String, required: true, maxlength: 60 },
  voice: { type: String, required: true },
  speed: { type: Number, default: 1, min: 0.5, max: 2 },
  color: { type: String, default: "#c6ff3d" },
}, opts));

const Lexicon = models.Lexicon || model("Lexicon", new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  rules: [{ _id: false, from: { type: String, maxlength: 100 }, to: { type: String, maxlength: 200 } }],
}, opts));

// One row per user/day/source; writes are $inc upserts.
const Usage = models.Usage || model("Usage", new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  day: { type: String, required: true }, // YYYY-MM-DD (UTC)
  source: { type: String, enum: ["web", "sdk", "server"], required: true },
  characters: { type: Number, default: 0 },
  seconds: { type: Number, default: 0 },
  generations: { type: Number, default: 0 },
}, { versionKey: false }).index({ user: 1, day: 1, source: 1 }, { unique: true }));

// Single global counter document for the public "characters spoken" ticker.
const Stats = models.Stats || model("Stats", new Schema({
  _id: { type: String, default: "global" },
  characters: { type: Number, default: 0 },
  seconds: { type: Number, default: 0 },
  generations: { type: Number, default: 0 },
}, { versionKey: false }));

export { User, ApiKey, Project, Preset, Lexicon, Usage, Stats };

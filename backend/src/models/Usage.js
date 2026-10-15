import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

export const USAGE_SOURCES = ["web", "sdk", "server", "desktop", "extension", "word"];

// One row per user/day/source; writes are $inc upserts.
export const Usage = models.Usage || model("Usage", new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  day: { type: String, required: true }, // YYYY-MM-DD (UTC)
  source: { type: String, enum: USAGE_SOURCES, required: true },
  characters: { type: Number, default: 0 },
  seconds: { type: Number, default: 0 },
  generations: { type: Number, default: 0 },
}, { versionKey: false }).index({ user: 1, day: 1, source: 1 }, { unique: true }));

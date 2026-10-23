import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

// Single global counter document for the public "characters spoken" ticker.
export const Stats = models.Stats || model("Stats", new Schema({
  _id: { type: String, default: "global" },
  characters: { type: Number, default: 0 },
  seconds: { type: Number, default: 0 },
  generations: { type: Number, default: 0 },
  // Download-button clicks on kelados.in, per platform. GitHub's own asset counts also include install scripts and updates.
  downloads: { windows: Number, mac: Number, linux: Number, chrome: Number },
}, { versionKey: false }));

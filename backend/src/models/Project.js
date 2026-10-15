import mongoose from "mongoose";
import { schemaOptions } from "./options.js";

const { Schema, model, models } = mongoose;

const block = new Schema({
  text: { type: String, default: "", maxlength: 20000 },
  voice: { type: String, default: "af_heart" },
  speed: { type: Number, default: 1, min: 0.5, max: 2 },
  pauseAfter: { type: Number, default: 0.4, min: 0, max: 5 },
}, { _id: true });

export const Project = models.Project || model("Project", new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, maxlength: 140 },
  kind: { type: String, enum: ["audiobook", "podcast", "voiceover", "other"], default: "other" },
  blocks: { type: [block], default: [] },
}, schemaOptions));

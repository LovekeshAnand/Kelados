import mongoose from "mongoose";
import { schemaOptions } from "./options.js";

const { Schema, model, models } = mongoose;

export const Preset = models.Preset || model("Preset", new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: { type: String, required: true, maxlength: 60 },
  voice: { type: String, required: true },
  speed: { type: Number, default: 1, min: 0.5, max: 2 },
  color: { type: String, default: "#ffb3d1" },
}, schemaOptions));

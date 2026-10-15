import mongoose from "mongoose";
import { schemaOptions } from "./options.js";

const { Schema, model, models } = mongoose;

// Only the sha256 of a key is stored; the plaintext is shown once at creation.
export const ApiKey = models.ApiKey || model("ApiKey", new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: { type: String, required: true, maxlength: 60 },
  prefix: { type: String, required: true },
  hash: { type: String, required: true, unique: true },
  lastUsedAt: Date,
}, schemaOptions));

import mongoose from "mongoose";
import { schemaOptions } from "./options.js";

const { Schema, model, models } = mongoose;

// Pronunciation rules (TTS) double as the personal dictionary for dictation (STT).
export const Lexicon = models.Lexicon || model("Lexicon", new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  rules: [{ _id: false, from: { type: String, maxlength: 100 }, to: { type: String, maxlength: 200 } }],
}, schemaOptions));

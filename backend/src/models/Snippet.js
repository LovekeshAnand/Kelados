import mongoose from "mongoose";
import { schemaOptions } from "./options.js";

const { Schema, model, models } = mongoose;

// Voice snippets: say the trigger while dictating and the expansion is inserted instead.
export const Snippet = models.Snippet || model("Snippet", new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  items: [{ _id: false, trigger: { type: String, maxlength: 60 }, text: { type: String, maxlength: 4000 } }],
}, schemaOptions));

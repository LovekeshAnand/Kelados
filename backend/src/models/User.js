import mongoose from "mongoose";
import { schemaOptions } from "./options.js";

const { Schema, model, models } = mongoose;

export const User = models.User || model("User", new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  passwordHash: { type: String, required: true },
}, schemaOptions));

import mongoose from "mongoose";
import { HttpError } from "./HttpError.js";

/** Validate with a zod schema; a failure becomes a 400 listing every issue. */
export const parse = (schema, data) => {
  const r = schema.safeParse(data);
  if (!r.success) throw new HttpError(400, r.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; "));
  return r.data;
};

/** Malformed ids are indistinguishable from missing documents. */
export const objectId = (id) => {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(404, "Not found");
  return id;
};

export const found = (doc) => {
  if (!doc) throw new HttpError(404, "Not found");
  return doc;
};

export const publicUser = (u) => ({ id: u._id, email: u.email, name: u.name, createdAt: u.createdAt });

export const today = () => new Date().toISOString().slice(0, 10);

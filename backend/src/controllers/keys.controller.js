import { ApiKey } from "../models/index.js";
import { HttpError } from "../utils/HttpError.js";
import { objectId, parse } from "../utils/helpers.js";
import { newApiKey } from "../utils/security.js";
import * as schema from "../validators/schemas.js";

export async function list(req, res) {
  res.json({ keys: await ApiKey.find({ user: req.userId }).select("-hash").sort({ createdAt: -1 }).lean() });
}

export async function create(req, res) {
  const { name } = parse(schema.keyCreate, req.body);
  if ((await ApiKey.countDocuments({ user: req.userId })) >= 20) throw new HttpError(400, "Limit of 20 keys reached, revoke one first");
  const k = newApiKey();
  const doc = await ApiKey.create({ user: req.userId, name, prefix: k.prefix, hash: k.hash });
  res.status(201).json({ key: k.plain, id: doc._id, name, prefix: k.prefix, createdAt: doc.createdAt });
}

export async function remove(req, res) {
  const r = await ApiKey.deleteOne({ _id: objectId(req.params.id), user: req.userId });
  if (!r.deletedCount) throw new HttpError(404, "Not found");
  res.status(204).end();
}

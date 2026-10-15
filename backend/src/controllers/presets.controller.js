import { Preset } from "../models/index.js";
import { HttpError } from "../utils/HttpError.js";
import { found, objectId, parse } from "../utils/helpers.js";
import * as schema from "../validators/schemas.js";

export async function list(req, res) {
  res.json({ presets: await Preset.find({ user: req.userId }).sort({ createdAt: 1 }).lean() });
}

export async function create(req, res) {
  if ((await Preset.countDocuments({ user: req.userId })) >= 100) throw new HttpError(400, "Limit of 100 presets reached");
  res.status(201).json({ preset: await Preset.create({ ...parse(schema.preset, req.body), user: req.userId }) });
}

export async function update(req, res) {
  const preset = await Preset.findOneAndUpdate({ _id: objectId(req.params.id), user: req.userId },
    parse(schema.preset, req.body), { new: true }).lean();
  res.json({ preset: found(preset) });
}

export async function remove(req, res) {
  const r = await Preset.deleteOne({ _id: objectId(req.params.id), user: req.userId });
  if (!r.deletedCount) throw new HttpError(404, "Not found");
  res.status(204).end();
}

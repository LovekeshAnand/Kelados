import mongoose from "mongoose";
import { Project } from "../models/index.js";
import { HttpError } from "../utils/HttpError.js";
import { found, objectId, parse } from "../utils/helpers.js";
import * as schema from "../validators/schemas.js";

export async function list(req, res) {
  const projects = await Project.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(String(req.userId)) } },
    { $sort: { updatedAt: -1 } },
    { $project: { title: 1, kind: 1, createdAt: 1, updatedAt: 1, blockCount: { $size: "$blocks" },
      characters: { $sum: { $map: { input: "$blocks", in: { $strLenCP: "$$this.text" } } } } } },
  ]);
  res.json({ projects });
}

export async function create(req, res) {
  if ((await Project.countDocuments({ user: req.userId })) >= 200) throw new HttpError(400, "Limit of 200 projects reached");
  res.status(201).json({ project: await Project.create({ ...parse(schema.project, req.body), user: req.userId }) });
}

export async function get(req, res) {
  res.json({ project: found(await Project.findOne({ _id: objectId(req.params.id), user: req.userId }).lean()) });
}

export async function update(req, res) {
  const project = await Project.findOneAndUpdate({ _id: objectId(req.params.id), user: req.userId },
    parse(schema.project, req.body), { new: true, runValidators: true }).lean();
  res.json({ project: found(project) });
}

export async function remove(req, res) {
  const r = await Project.deleteOne({ _id: objectId(req.params.id), user: req.userId });
  if (!r.deletedCount) throw new HttpError(404, "Not found");
  res.status(204).end();
}

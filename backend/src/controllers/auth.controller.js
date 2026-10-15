import { ApiKey, Lexicon, Preset, Project, Snippet, Usage, User } from "../models/index.js";
import { HttpError } from "../utils/HttpError.js";
import { parse, publicUser } from "../utils/helpers.js";
import { hashPassword, signToken, verifyPassword } from "../utils/security.js";
import * as schema from "../validators/schemas.js";

export async function register(req, res) {
  const body = parse(schema.register, req.body);
  if (await User.exists({ email: body.email.toLowerCase() })) throw new HttpError(409, "An account with this email already exists");
  const user = await User.create({ email: body.email, name: body.name, passwordHash: await hashPassword(body.password) });
  res.status(201).json({ token: signToken(user._id), user: publicUser(user) });
}

export async function login(req, res) {
  const body = parse(schema.credentials, req.body);
  const user = await User.findOne({ email: body.email.toLowerCase() });
  if (!user || !(await verifyPassword(body.password, user.passwordHash))) throw new HttpError(401, "Wrong email or password");
  res.json({ token: signToken(user._id), user: publicUser(user) });
}

export async function me(req, res) {
  res.json({ user: publicUser(await User.findById(req.userId)) });
}

export async function updateMe(req, res) {
  const body = parse(schema.profile, req.body);
  res.json({ user: publicUser(await User.findByIdAndUpdate(req.userId, body, { new: true })) });
}

export async function deleteMe(req, res) {
  const user = { user: req.userId };
  await Promise.all([ApiKey, Project, Preset, Lexicon, Snippet, Usage].map((M) => M.deleteMany(user)));
  await User.findByIdAndDelete(req.userId);
  res.status(204).end();
}

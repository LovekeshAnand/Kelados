import { Lexicon, Preset, Snippet, User } from "../models/index.js";

// One call gives the SDK, desktop app and extensions everything they need.
export async function get(req, res) {
  const [user, presets, lexicon, snippets] = await Promise.all([
    User.findById(req.userId).lean(),
    Preset.find({ user: req.userId }).lean(),
    Lexicon.findOne({ user: req.userId }).lean(),
    Snippet.findOne({ user: req.userId }).lean(),
  ]);
  res.json({ user: { name: user.name }, presets, lexicon: lexicon?.rules ?? [], snippets: snippets?.items ?? [] });
}

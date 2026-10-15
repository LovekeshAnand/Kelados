import { Lexicon, Snippet } from "../models/index.js";
import { parse } from "../utils/helpers.js";
import * as schema from "../validators/schemas.js";

// Lexicon: pronunciation rules for TTS and the personal dictionary for dictation.
export async function getLexicon(req, res) {
  res.json({ rules: (await Lexicon.findOne({ user: req.userId }).lean())?.rules ?? [] });
}

export async function putLexicon(req, res) {
  const { rules } = parse(schema.lexicon, req.body);
  await Lexicon.updateOne({ user: req.userId }, { rules }, { upsert: true });
  res.json({ rules });
}

export async function getSnippets(req, res) {
  res.json({ items: (await Snippet.findOne({ user: req.userId }).lean())?.items ?? [] });
}

export async function putSnippets(req, res) {
  const { items } = parse(schema.snippets, req.body);
  await Snippet.updateOne({ user: req.userId }, { items }, { upsert: true });
  res.json({ items });
}

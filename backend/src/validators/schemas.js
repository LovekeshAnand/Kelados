import { z } from "zod";
import { USAGE_SOURCES } from "../models/index.js";

const voice = z.string().regex(/^[a-z]{2}_[a-z]+$/, "unknown voice id");
const speed = z.number().min(0.5).max(2);

export const credentials = z.object({ email: z.email().max(200), password: z.string().min(8).max(200) });
export const register = credentials.extend({ name: z.string().trim().min(1).max(80) });
export const profile = z.object({ name: z.string().trim().min(1).max(80) });
export const keyCreate = z.object({ name: z.string().trim().min(1).max(60) });

export const project = z.object({
  title: z.string().trim().min(1).max(140),
  kind: z.enum(["audiobook", "podcast", "voiceover", "other"]).default("other"),
  blocks: z.array(z.object({
    _id: z.string().optional(),
    text: z.string().max(20000),
    voice,
    speed: speed.default(1),
    pauseAfter: z.number().min(0).max(5).default(0.4),
  })).max(500).default([]),
});

export const preset = z.object({
  name: z.string().trim().min(1).max(60),
  voice,
  speed: speed.default(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#ffb3d1"),
});

export const lexicon = z.object({
  rules: z.array(z.object({ from: z.string().trim().min(1).max(100), to: z.string().trim().min(1).max(200) })).max(500),
});

export const snippets = z.object({
  items: z.array(z.object({ trigger: z.string().trim().min(1).max(60), text: z.string().min(1).max(4000) })).max(200),
});

export const usage = (via) => z.object({
  characters: z.number().int().min(0).max(1_000_000),
  seconds: z.number().min(0).max(36_000).default(0),
  source: z.enum(USAGE_SOURCES).default(via === "key" ? "sdk" : "web"),
});

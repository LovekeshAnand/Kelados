import { Router } from "express";
import * as dictionary from "../controllers/dictionary.controller.js";
import * as usage from "../controllers/usage.controller.js";
import * as workspace from "../controllers/workspace.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";
import authRoutes from "./auth.routes.js";
import keyRoutes from "./keys.routes.js";
import presetRoutes from "./presets.routes.js";
import projectRoutes from "./projects.routes.js";

const api = Router();

api.get("/stats", usage.publicStats);
api.post("/downloads/:platform", rateLimit(10, 60 * 60_000), usage.download);

api.use("/auth", authRoutes);
api.use("/keys", keyRoutes);
api.use("/projects", projectRoutes);
api.use("/presets", presetRoutes);

api.get("/lexicon", requireAuth(), dictionary.getLexicon);
api.put("/lexicon", requireAuth(), dictionary.putLexicon);
api.get("/snippets", requireAuth(), dictionary.getSnippets);
api.put("/snippets", requireAuth(), dictionary.putSnippets);

api.post("/usage", requireAuth(), usage.report);
api.get("/usage", requireAuth(), usage.history);

api.get("/v1/workspace", requireAuth(), workspace.get);

export default api;

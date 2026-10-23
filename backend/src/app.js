// Vercel picks src/app.js as the entrypoint (ahead of index.js) and serves its default export.
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { connectDb } from "./config/db.js";
import { errorHandler, notFound } from "./middleware/error.js";
import api from "./routes/index.js";

export function createApp() {
  const app = express();
  const origins = env.corsOrigins;

  app.set("trust proxy", true);
  app.use(helmet());
  app.use(cors({ origin: origins.includes("*") ? true : origins, maxAge: 86400 }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => res.json({ ok: true, service: "kelados", time: new Date().toISOString() }));

  app.use("/api", async (_req, _res, next) => { await connectDb(); next(); }, api, notFound);
  app.use(errorHandler);

  return app;
}

export default createApp();

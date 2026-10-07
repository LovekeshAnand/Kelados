// Vercel entry: the platform detects src/index.js and serves the default-exported Express app.
// The direct express import is what Vercel's entrypoint detection looks for.
import "express";
import { createApp } from "./api.js";

export default createApp();

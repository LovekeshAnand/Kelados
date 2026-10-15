import { Router } from "express";
import * as keys from "../controllers/keys.controller.js";
import { requireAuth } from "../middleware/auth.js";

// API keys are managed from the web app only.
const router = Router();
router.use(requireAuth("jwt"));

router.get("/", keys.list);
router.post("/", keys.create);
router.delete("/:id", keys.remove);

export default router;

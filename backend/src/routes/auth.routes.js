import { Router } from "express";
import * as auth from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";

const router = Router();

router.post("/register", rateLimit(10, 15 * 60_000), auth.register);
router.post("/login", rateLimit(20, 15 * 60_000), auth.login);
router.get("/me", requireAuth("jwt"), auth.me);
router.patch("/me", requireAuth("jwt"), auth.updateMe);
router.delete("/me", requireAuth("jwt"), auth.deleteMe);

export default router;

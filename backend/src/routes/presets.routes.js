import { Router } from "express";
import * as presets from "../controllers/presets.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth());

router.get("/", presets.list);
router.post("/", presets.create);
router.put("/:id", presets.update);
router.delete("/:id", presets.remove);

export default router;

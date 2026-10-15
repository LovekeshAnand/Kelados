import { Router } from "express";
import * as projects from "../controllers/projects.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth());

router.get("/", projects.list);
router.post("/", projects.create);
router.get("/:id", projects.get);
router.put("/:id", projects.update);
router.delete("/:id", projects.remove);

export default router;

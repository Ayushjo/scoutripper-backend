import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import * as UserController from "../controllers/user.controller";

const router = Router();

router.get("/me", requireAuth, UserController.getMe);
router.patch("/me", requireAuth, UserController.updateMe);

export default router;

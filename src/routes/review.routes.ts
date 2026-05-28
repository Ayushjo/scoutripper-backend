import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import * as ReviewController from "../controllers/review.controller";

const router = Router();

router.post("/", requireAuth, ReviewController.createReview);
router.post("/:id/helpful", requireAuth, ReviewController.markHelpful);

export default router;

import { Router } from "express";
import * as ExperienceController from "../controllers/experience.controller";

const router = Router();

router.get("/", ExperienceController.getExperiences);
router.get("/featured", ExperienceController.getFeaturedExperiences);
router.get("/location/:slug", ExperienceController.getExperiencesByLocation);
router.get("/:slug", ExperienceController.getExperienceBySlug);

export default router;

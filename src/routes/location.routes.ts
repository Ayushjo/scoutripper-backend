import { Router } from "express";
import * as LocationController from "../controllers/location.controller";

const router = Router();

router.get("/", LocationController.getLocations);
router.get("/:slug", LocationController.getLocationBySlug);

export default router;

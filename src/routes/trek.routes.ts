import { Router, Request, Response, NextFunction } from "express";
import * as TrekController from "../controllers/trek.controller";

const router = Router();

router.get("/featured", TrekController.getFeaturedTreks);
router.get("/location/:slug", TrekController.getTreksByLocation);
router.get("/:slug/breadcrumb", TrekController.getTrekBreadcrumb);
router.get("/:slug/related", TrekController.getRelatedTreks);
router.get("/:slug", TrekController.getTrekBySlug);
router.get("/", TrekController.getAllTreks);

export default router;

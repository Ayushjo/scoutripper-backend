import { Router, Request, Response, NextFunction } from "express";
import * as TrekController from "../controllers/trek.controller";
import { requireAuth } from "../middlewares/auth.middleware";
const router = Router();

router.get("/featured", TrekController.getFeaturedTreks);
router.get("/location/:slug", TrekController.getTreksByLocation);
router.get("/:slug/breadcrumb", TrekController.getTrekBreadcrumb);
router.get("/:slug/routes", TrekController.getTrekRoutes);
router.get("/:slug/related", TrekController.getRelatedTreks);
router.get("/:slug/listings", TrekController.getTrekListings);
router.get("/:slug", TrekController.getTrekBySlug);
router.get("/", TrekController.getAllTreks);
router.get("/me/wishlist", requireAuth, (req, res) => {
  res.json({ success: true, message: `Hello ${(req as any).user.name}` });
});
export default router;

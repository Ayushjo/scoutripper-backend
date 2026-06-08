import { Router, Request, Response, NextFunction } from "express";
import * as TrekController from "../controllers/trek.controller";
import { requireAuth } from "../middlewares/auth.middleware";
const router = Router();

router.get("/featured", TrekController.getFeaturedTreks);
router.get("/location/:slug", TrekController.getTreksByLocation);
router.get("/:slug/breadcrumb", TrekController.getTrekBreadcrumb);
router.get("/:slug/routes", TrekController.getTrekRoutes);
router.get("/:slug/nearby-locations", TrekController.getNearbyLocations);
router.get("/:slug/related", TrekController.getRelatedTreks);
router.get("/:slug/listings", TrekController.getTrekListings);
// Static /me/wishlist MUST come before /:slug to avoid being shadowed
router.get("/me/wishlist", requireAuth, (req, res) => {
  res.json({ success: true, message: `Hello ${(req as any).user.name}` });
});
router.get("/", TrekController.getAllTreks);
router.get("/:slug", TrekController.getTrekBySlug);
export default router;

import { Router } from "express";
import * as ListingController from "../controllers/listing.controller";

const router = Router();

router.get("/:id/reviews", ListingController.getListingReviews);
router.get("/:id", ListingController.getListingById);

export default router;

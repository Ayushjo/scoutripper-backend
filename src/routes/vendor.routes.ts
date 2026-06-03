import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import * as VendorController from "../controllers/vendor.controller";

const router = Router();

// All vendor routes are protected
router.use(requireAuth);

// Task 1 — trek picker
router.get("/treks", VendorController.getTreks);

// Task 4 — list all listings for a vendor (before /:id to avoid shadowing)
router.get("/listings", VendorController.getVendorListings);

// Task 6 — add slots (before /:id GET/PATCH to avoid router ambiguity)
router.post("/listings/:id/slots", VendorController.addSlots);

// Task 5 — full listing detail
router.get("/listings/:id", VendorController.getVendorListingDetail);

// Task 2 — create listing
router.post("/listings", VendorController.createListing);

// Task 3 — update listing
router.patch("/listings/:id", VendorController.updateListing);

// Task 7 — update slot
router.patch("/slots/:id", VendorController.updateSlot);

// Task 8 — delete slot
router.delete("/slots/:id", VendorController.deleteSlot);

export default router;

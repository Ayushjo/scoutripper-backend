import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import * as WishlistController from "../controllers/wishlist.controller";

const router = Router();

router.get("/", requireAuth, WishlistController.getWishlist);
router.post("/", requireAuth, WishlistController.addToWishlist);
router.delete("/:id", requireAuth, WishlistController.removeFromWishlist);

export default router;

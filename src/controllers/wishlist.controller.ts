import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import * as WishlistService from "../services/wishlist.service";

export const getWishlist = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const items = await WishlistService.getWishlist(req.user!.id);
    res.json({ success: true, data: items });
  } catch (error) {
    console.error("getWishlist error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const addToWishlist = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { item_type, item_id, item_slug } = req.body as {
      item_type: string;
      item_id: number;
      item_slug: string;
    };

    if (!item_type || !item_id || !item_slug) {
      res.status(400).json({
        success: false,
        message: "item_type, item_id, and item_slug are required",
      });
      return;
    }

    const result = await WishlistService.addToWishlist(
      req.user!.id,
      item_type,
      item_id,
      item_slug,
    );

    if ("error" in result) {
      res.status(result.status ?? 400).json({ success: false, message: result.error });
      return;
    }

    res.status(201).json({ success: true, data: result.data });
  } catch (error) {
    console.error("addToWishlist error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const removeFromWishlist = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id: rawId } = req.params as { id: string };

    if (!/^\d+$/.test(rawId)) {
      res.status(400).json({ success: false, message: "Invalid wishlist ID" });
      return;
    }

    const result = await WishlistService.removeFromWishlist(
      BigInt(rawId),
      req.user!.id,
    );

    if ("error" in result) {
      res.status(result.status).json({ success: false, message: result.error });
      return;
    }

    res.json({ success: true, message: "Removed from wishlist" });
  } catch (error) {
    console.error("removeFromWishlist error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

import { Request, Response } from "express";
import * as ListingService from "../services/listing.service";

export const getListingById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id: rawId } = req.params as { id: string };

    if (!/^\d+$/.test(rawId)) {
      res.status(400).json({ success: false, message: "Invalid listing ID" });
      return;
    }

    const id = BigInt(rawId);
    const listing = await ListingService.getListingById(id);

    if (!listing) {
      res.status(404).json({ success: false, message: "Listing not found" });
      return;
    }

    res.json({ success: true, data: listing });
  } catch (error) {
    console.error("getListingById error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

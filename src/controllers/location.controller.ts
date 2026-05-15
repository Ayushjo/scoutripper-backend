import { Request, Response } from "express";
import * as LocationService from "../services/location.service";

export const getLocations = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    const locations = await LocationService.getLocations();
    res.json({ success: true, data: locations });
  } catch (error) {
    console.error("getLocations error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getLocationBySlug = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { slug } = req.params as { slug: string };
    const location = await LocationService.getLocationBySlug(slug);

    if (!location) {
      res.status(404).json({ success: false, message: "Location not found" });
      return;
    }

    res.json({ success: true, data: location });
  } catch (error) {
    console.error("getLocationBySlug error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

import { Request, Response } from "express";
import * as ExperienceService from "../services/experience.service";
import { PaginationMeta } from "../types/trek.types";

export const getExperiences = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const status =
      typeof req.query.status === "string" ? req.query.status : "publish";
    const isFeatured =
      typeof req.query.isFeatured === "string"
        ? req.query.isFeatured
        : undefined;

    const result = await ExperienceService.getExperiences({
      status,
      isFeatured,
      page,
      limit,
    });

    res.json({
      success: true,
      data: result.experiences,
      meta: result.meta,
    });
  } catch (error) {
    console.error("getExperiences error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getFeaturedExperiences = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    const experiences = await ExperienceService.getFeaturedExperiences();
    res.json({ success: true, data: experiences });
  } catch (error) {
    console.error("getFeaturedExperiences error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getExperienceBySlug = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { slug } = req.params as { slug: string };
    const experience = await ExperienceService.getExperienceBySlug(slug);

    if (!experience) {
      res.status(404).json({ success: false, message: "Experience not found" });
      return;
    }

    res.json({ success: true, data: experience });
  } catch (error) {
    console.error("getExperienceBySlug error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getExperiencesByLocation = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { slug } = req.params as { slug: string };
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const result = await ExperienceService.getExperiencesByLocation(slug, page, limit);

    if (!result) {
      res.status(404).json({ success: false, message: "Location not found" });
      return;
    }

    const meta: PaginationMeta = {
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    };

    res.json({ success: true, data: result.experiences, meta });
  } catch (error) {
    console.error("getExperiencesByLocation error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

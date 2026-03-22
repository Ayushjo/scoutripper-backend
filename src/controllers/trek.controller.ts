import { Request, Response } from "express";
import * as TrekService from "../services/trek.service";
import { ApiResponse, PaginationMeta } from "../types/trek.types";


export const getAllTreks = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const status =
      typeof req.query.status === "string" ? req.query.status : undefined;
    const isFeatured =
      typeof req.query.isFeatured === "string"
        ? req.query.isFeatured
        : undefined;
    const categoryId =
      typeof req.query.categoryId === "string"
        ? Number(req.query.categoryId)
        : undefined;
    const minPrice =
      typeof req.query.minPrice === "string"
        ? Number(req.query.minPrice)
        : undefined;
    const maxPrice =
      typeof req.query.maxPrice === "string"
        ? Number(req.query.maxPrice)
        : undefined;
    const duration =
      typeof req.query.duration === "string"
        ? Number(req.query.duration)
        : undefined;

    const { treks, total } = await TrekService.getAllTreks({
      status,
      categoryId,
      isFeatured,
      minPrice,
      maxPrice,
      duration,
      page,
      limit,
    });

    const meta: PaginationMeta = {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    const response: ApiResponse<typeof treks> = {
      success: true,
      data: treks,
      meta,
    };

    res.json(response);
  } catch (error) {
    console.error("getAllTreks error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};


export const getTrekBySlug = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { slug } = req.params as any;
    const trek = await TrekService.getTrekBySlug(slug);

    if (!trek) {
      res.status(404).json({ success: false, message: "Trek not found" });
      return;
    }

    res.json({ success: true, data: trek });
  } catch (error) {
    console.error("getTrekBySlug error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};


export const getTrekBreadcrumb = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { slug } = req.params as any;
    const breadcrumb = await TrekService.getTrekBreadcrumb(slug);

    if (!breadcrumb) {
      res.status(404).json({ success: false, message: "Trek not found" });
      return;
    }

    res.json({ success: true, data: breadcrumb });
  } catch (error) {
    console.error("getTrekBreadcrumb error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getRelatedTreks = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { slug } = req.params as any;
    const limit = Number(req.query.limit) || 6;

    const related = await TrekService.getRelatedTreks(slug, limit);

    res.json({ success: true, data: related });
  } catch (error) {
    console.error("getRelatedTreks error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};


export const getTreksByLocation = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { slug } = req.params as any;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const result = await TrekService.getTreksByLocation(slug, page, limit);

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

    res.json({ success: true, data: result, meta });
  } catch (error) {
    console.error("getTreksByLocation error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};


export const getFeaturedTreks = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const limit = Number(req.query.limit) || 6;
    const treks = await TrekService.getFeaturedTreks(limit);

    res.json({ success: true, data: treks });
  } catch (error) {
    console.error("getFeaturedTreks error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

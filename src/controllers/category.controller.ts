import { Request, Response } from "express";
import * as CategoryService from "../services/category.service";

export const getCategories = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    const categories = await CategoryService.getCategories();
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error("getCategories error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getTreksByCategory = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { slug } = req.params as { slug: string };
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const result = await CategoryService.getTreksByCategory(slug, page, limit);

    if (!result) {
      res.status(404).json({ success: false, message: "Category not found" });
      return;
    }

    res.json({ success: true, data: result.treks, meta: result.meta });
  } catch (error) {
    console.error("getTreksByCategory error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

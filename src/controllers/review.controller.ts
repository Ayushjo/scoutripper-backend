import { Request, Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import * as ReviewService from "../services/review.service";
import { CreateReviewBody } from "../services/review.service";

export const createReview = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const body = req.body as CreateReviewBody;
    const result = await ReviewService.createReview(req.user!.id, body);

    if ("error" in result) {
      res.status(result.status).json({ success: false, message: result.error });
      return;
    }

    res.status(201).json({ success: true, data: result.data });
  } catch (error) {
    console.error("createReview error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const markHelpful = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id: rawId } = req.params as { id: string };

    if (!/^\d+$/.test(rawId)) {
      res.status(400).json({ success: false, message: "Invalid review ID" });
      return;
    }

    const { type } = req.body as { type?: string };

    if (!type) {
      res.status(400).json({ success: false, message: "type is required" });
      return;
    }

    const result = await ReviewService.markHelpful(BigInt(rawId), type);

    if ("error" in result) {
      res.status(result.status).json({ success: false, message: result.error });
      return;
    }

    res.json({ success: true, message: result.message });
  } catch (error) {
    console.error("markHelpful error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

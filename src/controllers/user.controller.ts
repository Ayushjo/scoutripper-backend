import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import * as UserService from "../services/user.service";

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await UserService.getMe(req.user!.id);

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error("getMe error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const updateMe = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { name, image } = req.body as { name?: string; image?: string };
    const user = await UserService.updateMe(req.user!.id, { name, image });

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error("updateMe error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

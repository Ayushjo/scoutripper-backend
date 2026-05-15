import { Router } from "express";
import * as CategoryController from "../controllers/category.controller";

const router = Router();

router.get("/", CategoryController.getCategories);
router.get("/:slug/treks", CategoryController.getTreksByCategory);

export default router;

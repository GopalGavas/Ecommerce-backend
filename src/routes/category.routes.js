import { Router } from "express";
import { isAdmin, verifyJwt } from "../middleware/auth.middleware.js";
import {
  createCategory,
  deleteCategory,
  getAllCategories,
  getCategoryBySlug,
  updateCategory,
} from "../controllers/category.controller.js";

const router = Router();

router.route("/").post(verifyJwt, isAdmin, createCategory);
router.route("/:catId").patch(verifyJwt, isAdmin, updateCategory);
router.route("/:catId").delete(verifyJwt, isAdmin, deleteCategory);
router.route("/:slug").get(verifyJwt, getCategoryBySlug);
router.route("/").get(verifyJwt, getAllCategories);

export default router;

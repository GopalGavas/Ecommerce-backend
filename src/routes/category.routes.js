import { Router } from "express";
import { isAdmin, verifyJwt } from "../middleware/auth.middleware.js";
import {
  createCategory,
  deleteCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
} from "../controllers/category.controller.js";

const router = Router();

router.route("/").post(verifyJwt, isAdmin, createCategory);
router.route("/:catId").patch(verifyJwt, isAdmin, updateCategory);
router.route("/:catId").delete(verifyJwt, isAdmin, deleteCategory);
router.route("/:catId").get(verifyJwt, getCategoryById);
router.route("/").get(verifyJwt, getAllCategories);

export default router;

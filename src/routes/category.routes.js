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

router.use(verifyJwt);

router.route("/").post(isAdmin, createCategory).get(getAllCategories);

router
  .route("/:catId")
  .patch(isAdmin, updateCategory)
  .delete(isAdmin, deleteCategory);

router.route("/:slug").get(getCategoryBySlug);

export default router;

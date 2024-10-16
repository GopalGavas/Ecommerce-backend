import { Router } from "express";
import { isAdmin, verifyJwt } from "../middleware/auth.middleware.js";
import {
  createBlog,
  deleteBlog,
  getAllBlogs,
  getBlogById,
  updateBlogDetails,
  updateBlogImage,
} from "../controllers/blog.controller.js";
import { upload } from "../middleware/multer.middleware.js";

const router = Router();

router.use(verifyJwt);

router.route("/create").post(upload.single("image"), createBlog);
router.route("/:blogId/update").patch(updateBlogDetails);
router
  .route("/:blogId/update-image")
  .patch(upload.single("image"), updateBlogImage);

router.route("/:blogId").get(getBlogById);
router.route("/").get(getAllBlogs);

router.route("/:blogId/delete").delete(deleteBlog);

// "ADMIN SPECIFIC ROUTES" {NOTE: TESTS ARE PENDING}
router.use(isAdmin);
router.route("/admin/:blogId/update").patch(updateBlogDetails);
router
  .route("/admin/:blogId/update-image")
  .patch(upload.single("image"), updateBlogImage);
router.route("/admin/:blogId/delete").delete(deleteBlog);

export default router;

import { Router } from "express";
import { verifyJwt } from "../middleware/auth.middleware.js";
import {
  createBlog,
  deleteBlog,
  updateBlogDetails,
  updateBlogImage,
} from "../controllers/blog.controller.js";
import { upload } from "../middleware/multer.middleware.js";

const router = Router();

router.route("/create").post(verifyJwt, upload.single("image"), createBlog);
router.route("/:blogId/update").patch(verifyJwt, updateBlogDetails);
router
  .route("/:blogId/update-image")
  .patch(verifyJwt, upload.single("image"), updateBlogImage);

router.route("/:blogId/delete").delete(verifyJwt, deleteBlog);

export default router;

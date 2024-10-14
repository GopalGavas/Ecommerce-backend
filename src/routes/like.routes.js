import { Router } from "express";
import { verifyJwt } from "../middleware/auth.middleware.js";
import { toggleBlogLike } from "../controllers/like.controller.js";

const router = Router();

router.route("/:blogId").post(verifyJwt, toggleBlogLike);

export default router;

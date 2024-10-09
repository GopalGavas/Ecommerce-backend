import { Router } from "express";
import { verifyJwt } from "../middleware/auth.middleware.js";
import { createProduct } from "../controllers/product.controller.js";
import { upload } from "../middleware/multer.middleware.js";

const router = Router();

router
  .route("/create")
  .post(
    upload.fields([{ name: "productImages", maxCount: 5 }]),
    verifyJwt,
    createProduct
  );

export default router;

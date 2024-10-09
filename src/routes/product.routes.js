import { Router } from "express";
import { verifyJwt } from "../middleware/auth.middleware.js";
import {
  createProduct,
  deleteProduct,
  getAllProducts,
  getProductById,
  updateProductDetails,
  updateProductImages,
} from "../controllers/product.controller.js";
import { upload } from "../middleware/multer.middleware.js";

const router = Router();

router
  .route("/create")
  .post(
    upload.fields([{ name: "productImages", maxCount: 5 }]),
    verifyJwt,
    createProduct
  );

router.route("/all").get(verifyJwt, getAllProducts);
router.route("/:prodId").get(verifyJwt, getProductById);
router.route("/:prodId/update-details").patch(verifyJwt, updateProductDetails);
router
  .route("/:prodId/update-productImages")
  .patch(
    upload.fields([{ name: "productImages" }]),
    verifyJwt,
    updateProductImages
  );

router.route("/:prodId/delete").delete(verifyJwt, deleteProduct);

export default router;

import { Router } from "express";
import { isAdmin, verifyJwt } from "../middleware/auth.middleware.js";
import {
  createProduct,
  deleteProduct,
  getAllProducts,
  getProductById,
  productRating,
  updateProductDetails,
  updateProductImages,
} from "../controllers/product.controller.js";
import { upload } from "../middleware/multer.middleware.js";

const router = Router();

// Apply JWT verification to all routes
router.use(verifyJwt);

// Common routes for both users and admins
router.route("/all").get(getAllProducts);
router.route("/:prodId").get(getProductById);

// Product creation route (for both users and admins)
router
  .route("/create")
  .post(upload.fields([{ name: "productImages", maxCount: 5 }]), createProduct);

// User-specific routes (product owner)
router.route("/:prodId/update-details").patch(updateProductDetails);
router
  .route("/:prodId/update-productImages")
  .patch(upload.fields([{ name: "productImages" }]), updateProductImages);

router.route("/:prodId/rating").post(productRating);
router.route("/:prodId/delete").delete(deleteProduct);

// Admin routes (admins can perform these actions on any product)
router.use(isAdmin);
router.route("/admin/:prodId/update-details").patch(updateProductDetails);
router
  .route("/admin/:prodId/update-productImages")
  .patch(upload.fields([{ name: "productImages" }]), updateProductImages);
router.route("/admin/:prodId/delete").delete(deleteProduct);

export default router;

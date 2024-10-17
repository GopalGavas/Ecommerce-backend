import { Router } from "express";
import {
  addToCart,
  applyCouponToCart,
  removeFromCart,
} from "../controllers/cart.controller.js";
import { verifyJwt } from "../middleware/auth.middleware.js";

const router = Router();

router.use(verifyJwt);

router.route("/").post(addToCart);
router.route("/remove-product").delete(removeFromCart);
router.route("/coupon").post(applyCouponToCart);

export default router;

import { Router } from "express";
import {
  addToCart,
  applyCouponToCart,
  clearCart,
  getCart,
  removeCouponFromCart,
  removeFromCart,
  updateCart,
} from "../controllers/cart.controller.js";
import { verifyJwt } from "../middleware/auth.middleware.js";

const router = Router();

router.use(verifyJwt);

router.route("/").post(addToCart);
router.route("/").get(getCart);
router.route("/update").patch(updateCart);
router.route("/remove-product").delete(removeFromCart);
router.route("/coupon").post(applyCouponToCart);
router.route("/remove-coupon").patch(removeCouponFromCart);
router.route("/clear").delete(clearCart);

export default router;

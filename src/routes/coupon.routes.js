import { Router } from "express";
import { isAdmin, verifyJwt } from "../middleware/auth.middleware.js";
import {
  createCoupon,
  deleteCoupon,
  getAllCoupons,
  updateCoupon,
} from "../controllers/coupon.controller.js";

const router = Router();

router.use(verifyJwt, isAdmin); // Apply middleware to all routes

router.route("/").post(createCoupon).get(getAllCoupons);
router.route("/:couponId").patch(updateCoupon).delete(deleteCoupon);

export default router;

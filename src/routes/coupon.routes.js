import { Router } from "express";
import { isAdmin, verifyJwt } from "../middleware/auth.middleware.js";
import {
  createCoupon,
  deleteCoupon,
  getAllCoupons,
  updateCoupon,
} from "../controllers/coupon.controller.js";

const router = Router();

router.use(verifyJwt, isAdmin);

router.route("/").post(createCoupon);
router.route("/:couponId").patch(updateCoupon);
router.route("/").get(getAllCoupons);
router.route("/:couponId").delete(deleteCoupon);

export default router;

import { Router } from "express";
import {
  blockUser,
  changePassword,
  deactivateOwnAccount,
  deleteOwnAccount,
  deleteUser,
  getCurrentUser,
  getUserById,
  getWishList,
  generateForgetPasswordToken,
  loginAdmin,
  loginUser,
  logoutUser,
  reactivateAccount,
  refreshAccessToken,
  registerUser,
  saveAddress,
  toggleWishList,
  unblockUser,
  updateUserDetails,
  resetPassword,
} from "../controllers/user.controller.js";
import { isAdmin, verifyJwt } from "../middleware/auth.middleware.js";
import { rateLimit } from "express-rate-limit";

const router = Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 30, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
  standardHeaders: "draft-7", // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
  // store: ... , // Redis, Memcached, etc. See below.
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
});

// "REGISTER AND LOGIN"
router.route("/register").post(limiter, registerUser);
router.route("/login").post(loginLimiter, loginUser);

// "ADMIN LOGIN"
router.route("/admin/login").post(loginLimiter, loginAdmin);

// {USE MIDDLEWARE}
router.use(verifyJwt);

// "SAFE ROUTES"
router.route("/logout").post(logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(changePassword);
router.route("/address").post(saveAddress);
router.route("/current-user").get(getCurrentUser);
router.route("/:userId").get(getUserById);
router.route("/update-details").patch(updateUserDetails);
router.route("/deactivate").patch(deactivateOwnAccount);
router.route("/delete").delete(deleteOwnAccount);
router.route("/wishlist/:prodId").post(toggleWishList);
router.route("/wishlist").get(getWishList);
router.route("/forgot-password").post(generateForgetPasswordToken);
router.route("/reset-password/:token").post(resetPassword);

/////////////// 'ADMIN FUNCTIONALITY' ////////////////////

// {ADMIN MIDDLEWARE}
router.use(isAdmin);

// "ADMIN ROUTES"
router.route("/admin/:userId").get(getUserById);
router.route("/admin/:userId/block").patch(blockUser);
router.route("/admin/:userId/unblock").patch(unblockUser);
router.route("/admin/:userId/delete").delete(deleteUser);
router.route("/admin/:userId/reactivate").patch(reactivateAccount);

export default router;

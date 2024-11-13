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
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
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
router.route("/wishlist").get(getWishList);
router.route("/current-user").get(getCurrentUser);
router.route("/:userId").get(getUserById);

router.route("/logout").post(logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(changePassword);
router.route("/address").post(saveAddress);
router.route("/wishlist/:prodId").post(toggleWishList);
router.route("/forgot-password").post(generateForgetPasswordToken);
router.route("/reset-password/:token").post(resetPassword);

router.route("/update-details").patch(updateUserDetails);
router.route("/deactivate").patch(deactivateOwnAccount);

router.route("/delete").delete(deleteOwnAccount);

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

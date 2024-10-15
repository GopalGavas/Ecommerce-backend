import { Router } from "express";
import {
  blockUser,
  changePassword,
  deactivateOwnAccount,
  deactivateUser,
  deleteOwnAccount,
  deleteUser,
  getCurrentUser,
  getUserById,
  getWishList,
  loginUser,
  logoutUser,
  reactivateAccount,
  refreshAccessToken,
  registerUser,
  toggleWishList,
  unblockUser,
  updateUserDetails,
} from "../controllers/user.controller.js";
import { isAdmin, verifyJwt } from "../middleware/auth.middleware.js";

const router = Router();

// "REGISTER AND LOGIN"
router.route("/register").post(registerUser);
router.route("/login").post(loginUser);

// "SAFE ROUTES"
router.route("/logout").post(verifyJwt, logoutUser);
router.route("/refresh-token").post(verifyJwt, refreshAccessToken);
router.route("/change-password").post(verifyJwt, changePassword);
router.route("/current-user").get(verifyJwt, getCurrentUser);
router.route("/update-details").patch(verifyJwt, updateUserDetails);
router.route("/deactivate").patch(verifyJwt, deactivateOwnAccount);
router.route("/delete").delete(verifyJwt, deleteOwnAccount);
router.route("/wishlist/:prodId").post(verifyJwt, toggleWishList);
router.route("/wishlist").get(verifyJwt, getWishList);

// "ADMIN ROUTES"
router.route("/:userId").get(verifyJwt, isAdmin, getUserById);
router.route("/:userId/block").patch(verifyJwt, isAdmin, blockUser);
router.route("/:userId/unblock").patch(verifyJwt, isAdmin, unblockUser);
router.route("/:userId/deactivate").patch(verifyJwt, isAdmin, deactivateUser);
router.route("/:userId/delete").delete(verifyJwt, isAdmin, deleteUser);
router
  .route("/:userId/reactivate")
  .patch(verifyJwt, isAdmin, reactivateAccount);

export default router;

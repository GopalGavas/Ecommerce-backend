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
} from "../controllers/user.controller.js";
import { isAdmin, verifyJwt } from "../middleware/auth.middleware.js";

const router = Router();

// "REGISTER AND LOGIN"
router.route("/register").post(registerUser);
router.route("/login").post(loginUser);

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

/////////////// 'ADMIN FUNCTIONALITY' ////////////////////
// "ADMIN LOGIN"
router.route("/admin/login").post(loginAdmin);

// {ADMIN MIDDLEWARE}
router.use(isAdmin);

// "ADMIN ROUTES"
router.route("/admin/:userId").get(getUserById);
router.route("/admin/:userId/block").patch(blockUser);
router.route("/admin/:userId/unblock").patch(unblockUser);
router.route("/admin/:userId/deactivate").patch(deactivateUser);
router.route("/admin/:userId/delete").delete(deleteUser);
router.route("/admin/:userId/reactivate").patch(reactivateAccount);

export default router;

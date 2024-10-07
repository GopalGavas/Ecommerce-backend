import { Router } from "express";
import {
  changePassword,
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  updateUserDetails,
} from "../controllers/user.controller.js";
import { verifyJwt } from "../middleware/auth.middleware.js";

const router = Router();

router.route("/register").post(registerUser);
router.route("/login").post(loginUser);

// safe routes
router.route("/logout").post(verifyJwt, logoutUser);
router.route("/refresh-token").post(verifyJwt, refreshAccessToken);
router.route("/change-password").post(verifyJwt, changePassword);
router.route("/current-user").get(verifyJwt, getCurrentUser);
router.route("/update-details").patch(verifyJwt, updateUserDetails);

export default router;

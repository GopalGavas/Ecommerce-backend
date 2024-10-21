import { Router } from "express";
import { isAdmin, verifyJwt } from "../middleware/auth.middleware.js";
import {
  createEnquiry,
  deleteEnquiry,
  getAllEnquiries,
  getEnquiryById,
  respondToEnquiry,
  updateEnquiry,
} from "../controllers/enquiry.controller.js";

const router = Router();

router.use(verifyJwt);

router.route("/").post(createEnquiry);
router.route("/:enquiryId/update").patch(updateEnquiry);
router.route("/:enquiryId").delete(deleteEnquiry);
router.route("/:enquiryId").get(getEnquiryById);

// "ADMIN ROUTES"
router.use(isAdmin);

router.route("/admin/all").get(getAllEnquiries);
router.route("/admin/:enquiryId").patch(respondToEnquiry);
router.route("/admin/:enquiryId").delete(deleteEnquiry);

export default router;

import { Router } from "express";
import {
  cancelOrder,
  createOrder,
  deleteOrder,
  getAllOrders,
  getOrderById,
  trackOrder,
  updateOrderStatus,
  updatePaymentStatusForCOD,
} from "../controllers/order.controller.js";
import { isAdmin, verifyJwt } from "../middleware/auth.middleware.js";

const router = Router();

router.use(verifyJwt);

router.route("/").post(createOrder);
router.route("/:orderId").get(getOrderById);
router.route("/:orderId/cancel").patch(cancelOrder);
router.route("/:orderId/track").get(trackOrder);

// 'Admin Routes'
router.route("/admin/all").get(isAdmin, getAllOrders);
router.route("/admin/:orderId").get(isAdmin, getOrderById);
router.route("/admin/:orderId/status").patch(isAdmin, updateOrderStatus);
router
  .route("/admin/:orderId/payment-status/cod")
  .patch(updatePaymentStatusForCOD);
router.route("/admin/:orderId/delete").delete(isAdmin, deleteOrder);

export default router;

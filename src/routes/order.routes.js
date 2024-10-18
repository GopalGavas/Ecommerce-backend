import { Router } from "express";
import { createOrder } from "../controllers/order.controller.js";
import { verifyJwt } from "../middleware/auth.middleware.js";

const router = Router();

router.use(verifyJwt);

router.route("/").post(createOrder);

export default router;

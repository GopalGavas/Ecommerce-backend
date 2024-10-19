import { Router } from "express";
import { healthCheckBackend } from "../controllers/healthcheck.controller.js";

const router = Router();

router.route("/").get(healthCheckBackend);

export default router;

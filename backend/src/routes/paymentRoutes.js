import { Router } from "express";

import authenticate from "../middleware/auth.js";
import {
  getKonnectPaymentStatus,
  initiateKonnectPayment,
  receiveKonnectWebhook,
} from "../controllers/paymentController.js";

const router = Router();

router.post("/konnect/init", authenticate, initiateKonnectPayment);
router.get("/konnect/status", getKonnectPaymentStatus);
router.get("/konnect/status/:paymentRef", getKonnectPaymentStatus);
router.get("/konnect/webhook", receiveKonnectWebhook);

export default router;

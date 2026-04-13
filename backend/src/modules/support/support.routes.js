import { Router } from "express";

import authenticate from "../../middlewares/auth.middleware.js";
import { uploadSupportAttachment } from "../../middlewares/upload.middleware.js";
import {
  addSupportTicketMessage,
  closeSupportTicket,
  createSupportTicket,
  getMySupportTicket,
  getMySupportTickets,
} from "./support.controller.js";

const router = Router();

router.use(authenticate);

router.post("/tickets", uploadSupportAttachment.single("attachment"), createSupportTicket);
router.get("/tickets", getMySupportTickets);
router.get("/tickets/:id", getMySupportTicket);
router.post("/tickets/:id/messages", uploadSupportAttachment.single("attachment"), addSupportTicketMessage);
router.patch("/tickets/:id/close", closeSupportTicket);

export default router;

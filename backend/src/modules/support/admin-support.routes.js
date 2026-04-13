import { Router } from "express";

import requireAdmin from "../../middlewares/admin.middleware.js";
import authenticate from "../../middlewares/auth.middleware.js";
import { uploadSupportAttachment } from "../../middlewares/upload.middleware.js";
import {
  addAdminSupportTicketMessage,
  addAdminSupportTicketNote,
  assignAdminSupportTicket,
  getAdminSupportTicket,
  getAdminSupportTickets,
  updateAdminSupportTicket,
} from "./admin-support.controller.js";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/tickets", getAdminSupportTickets);
router.get("/tickets/:id", getAdminSupportTicket);
router.post("/tickets/:id/messages", uploadSupportAttachment.single("attachment"), addAdminSupportTicketMessage);
router.post("/tickets/:id/notes", addAdminSupportTicketNote);
router.patch("/tickets/:id", updateAdminSupportTicket);
router.patch("/tickets/:id/assign", assignAdminSupportTicket);

export default router;

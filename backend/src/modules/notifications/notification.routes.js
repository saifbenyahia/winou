import { Router } from "express";
import authenticate from "../../middlewares/auth.middleware.js";
import {
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "./notification.controller.js";

const router = Router();

router.use(authenticate);

router.get("/", getMyNotifications);
router.post("/:id/read", markNotificationAsRead);
router.post("/read-all", markAllNotificationsAsRead);

export default router;

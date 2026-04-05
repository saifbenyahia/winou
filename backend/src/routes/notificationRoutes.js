import { Router } from "express";
import authenticate from "../middleware/auth.js";
import {
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../controllers/notificationController.js";

const router = Router();

router.use(authenticate);

router.get("/", getMyNotifications);
router.post("/:id/read", markNotificationAsRead);
router.post("/read-all", markAllNotificationsAsRead);

export default router;

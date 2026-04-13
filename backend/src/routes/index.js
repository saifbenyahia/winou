import { Router } from "express";

import authRoutes from "../modules/auth/auth.routes.js";
import campaignRoutes from "../modules/campaigns/campaign.routes.js";
import adminRoutes from "../modules/admin/admin.routes.js";
import savedRoutes from "../modules/saved/saved.routes.js";
import pledgeRoutes from "../modules/pledges/pledge.routes.js";
import notificationRoutes from "../modules/notifications/notification.routes.js";
import supportRoutes from "../modules/support/support.routes.js";
import adminSupportRoutes from "../modules/support/admin-support.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/campaigns", campaignRoutes);
router.use("/admin/support", adminSupportRoutes);
router.use("/admin", adminRoutes);
router.use("/saved", savedRoutes);
router.use("/pledges", pledgeRoutes);
router.use("/notifications", notificationRoutes);
router.use("/support", supportRoutes);

router.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default router;

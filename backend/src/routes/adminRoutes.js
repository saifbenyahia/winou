// ──────────────────────────────────────────────
// Admin Routes — /api/admin/*
// All routes protected by JWT + admin role check
// ──────────────────────────────────────────────

import { Router } from "express";
import authenticate from "../middleware/auth.js";
import {
  getStats,
  getPendingCampaigns,
  getUsers,
  approveCampaign,
  rejectCampaign,
  deleteUser,
  changeUserRole,
  updateUserName,
} from "../controllers/adminController.js";

const router = Router();

// Admin role check middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({
      success: false,
      message: "Accès réservé aux administrateurs.",
    });
  }
  next();
};

// All admin routes require JWT + ADMIN role
router.use(authenticate, requireAdmin);

router.get("/stats", getStats);
router.get("/campaigns/pending", getPendingCampaigns);
router.get("/users", getUsers);
router.post("/campaigns/:id/approve", approveCampaign);
router.post("/campaigns/:id/reject", rejectCampaign);

// ── User management ────
router.delete("/users/:id", deleteUser);
router.put("/users/:id/role", changeUserRole);
router.put("/users/:id/name", updateUserName);

export default router;

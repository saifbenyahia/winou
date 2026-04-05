// ──────────────────────────────────────────────
// Campaign Routes — /api/campaigns/*
// ──────────────────────────────────────────────

import { Router } from "express";
import authenticate from "../middleware/auth.js";
import {
  createCampaign,
  updateCampaign,
  submitCampaign,
  getActiveCampaigns,
  getMyCampaigns,
  getCampaignById,
  deleteCampaign,
} from "../controllers/campaignController.js";

const router = Router();

// ── Public routes ──────────────────────────────
router.get("/", getActiveCampaigns);
// ── Protected routes (require valid JWT) ───────
router.get("/my", authenticate, getMyCampaigns);  // Must be before /:id
router.get("/:id", getCampaignById);
router.post("/", authenticate, createCampaign);
router.put("/:id", authenticate, updateCampaign);
router.delete("/:id", authenticate, deleteCampaign);
router.post("/:id/submit", authenticate, submitCampaign);

import { uploadMedia } from "../middleware/upload.js";
import { uploadMediaCampaign } from "../controllers/campaignController.js";
router.post("/:id/media/:type", authenticate, uploadMedia.single('file'), uploadMediaCampaign);

export default router;

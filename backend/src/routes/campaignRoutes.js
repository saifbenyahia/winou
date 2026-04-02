// ──────────────────────────────────────────────
// Campaign Routes — /api/campaigns/*
// ──────────────────────────────────────────────

import { Router } from "express";
import authenticate from "../middleware/auth.js";
import { createCampaign, updateCampaign, submitCampaign, getActiveCampaigns } from "../controllers/campaignController.js";

const router = Router();

// ── Public routes ──────────────────────────────
router.get("/", getActiveCampaigns);

// ── Protected routes (require valid JWT) ───────
router.post("/", authenticate, createCampaign);
router.put("/:id", authenticate, updateCampaign);
router.post("/:id/submit", authenticate, submitCampaign);

import { uploadMedia } from "../middleware/upload.js";
import { uploadMediaCampaign } from "../controllers/campaignController.js";
router.post("/:id/media/:type", authenticate, uploadMedia.single('file'), uploadMediaCampaign);

export default router;

import { Router } from "express";

import authenticate from "../../middlewares/auth.middleware.js";
import { uploadMedia } from "../../middlewares/upload.middleware.js";
import { createCampaignComment, getCampaignComments } from "../comments/comment.controller.js";
import {
  createCampaign,
  deleteCampaign,
  getActiveCampaigns,
  getCampaignById,
  getMyCampaigns,
  submitCampaign,
  updateCampaign,
  uploadMediaCampaign,
} from "./campaign.controller.js";

const router = Router();

router.get("/", getActiveCampaigns);
router.get("/my", authenticate, getMyCampaigns);
router.get("/:id/comments", getCampaignComments);
router.get("/:id", getCampaignById);
router.post("/", authenticate, createCampaign);
router.post("/:id/comments", authenticate, createCampaignComment);
router.put("/:id", authenticate, updateCampaign);
router.delete("/:id", authenticate, deleteCampaign);
router.post("/:id/submit", authenticate, submitCampaign);
router.post("/:id/media/:type", authenticate, uploadMedia.single("file"), uploadMediaCampaign);

export default router;

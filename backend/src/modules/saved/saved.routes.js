import { Router } from "express";

import authenticate from "../../middlewares/auth.middleware.js";
import {
  addSavedCampaign,
  getSavedCampaigns,
  getSavedCampaignStatus,
  removeSavedCampaign,
} from "./saved.controller.js";

const router = Router();

router.use(authenticate);

router.get("/", getSavedCampaigns);
router.post("/:campaignId", addSavedCampaign);
router.delete("/:campaignId", removeSavedCampaign);
router.get("/check/:campaignId", getSavedCampaignStatus);

export default router;

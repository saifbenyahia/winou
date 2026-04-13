import { Router } from "express";
import authenticate from "../../middlewares/auth.middleware.js";
import { createPledge, getMySupportedCampaigns } from "./pledge.controller.js";

const router = Router();

router.get("/my", authenticate, getMySupportedCampaigns);
router.post("/", authenticate, createPledge);

export default router;

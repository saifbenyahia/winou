import { Router } from "express";

import authenticate from "../../middlewares/auth.middleware.js";
import requireAdmin from "../../middlewares/admin.middleware.js";
import { uploadMedia } from "../../middlewares/upload.middleware.js";
import { deleteAdminComment, getAdminCampaignComments } from "../comments/comment.controller.js";
import {
  approveCampaign,
  changeUserRole,
  deleteCampaign,
  deleteUser,
  getAllCampaigns,
  getPendingCampaigns,
  getPledges,
  getStats,
  getUsers,
  rejectCampaign,
  updateAcceptedCampaign,
  updateAcceptedCampaignImage,
  updateAcceptedCampaignVideo,
  updateUser,
  updateUserName,
} from "./admin.controller.js";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/stats", getStats);
router.get("/campaigns", getAllCampaigns);
router.get("/campaigns/pending", getPendingCampaigns);
router.get("/campaigns/:id/comments", getAdminCampaignComments);
router.get("/pledges", getPledges);
router.get("/users", getUsers);
router.put("/campaigns/:id", updateAcceptedCampaign);
router.post("/campaigns/:id/image", uploadMedia.single("file"), updateAcceptedCampaignImage);
router.post("/campaigns/:id/video", uploadMedia.single("file"), updateAcceptedCampaignVideo);
router.delete("/campaigns/:id", deleteCampaign);
router.delete("/comments/:commentId", deleteAdminComment);
router.put("/users/:id", updateUser);
router.post("/campaigns/:id/approve", approveCampaign);
router.post("/campaigns/:id/reject", rejectCampaign);
router.delete("/users/:id", deleteUser);
router.put("/users/:id/role", changeUserRole);
router.put("/users/:id/name", updateUserName);

export default router;

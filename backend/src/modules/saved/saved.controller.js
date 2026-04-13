import {
  checkSavedCampaign,
  listSavedCampaigns,
  saveCampaign,
  unsaveCampaign,
} from "./saved.service.js";

const handleSavedError = (res, error, label) => {
  console.error(label, error);
  return res.status(500).json({
    success: false,
    message: "Erreur serveur.",
  });
};

export const getSavedCampaigns = async (req, res) => {
  try {
    const campaigns = await listSavedCampaigns(req.user.id);
    return res.status(200).json({ success: true, campaigns });
  } catch (error) {
    return handleSavedError(res, error, "Get saved campaigns error:");
  }
};

export const addSavedCampaign = async (req, res) => {
  try {
    await saveCampaign(req.user.id, req.params.campaignId);
    return res.status(200).json({
      success: true,
      message: "Campagne enregistree.",
    });
  } catch (error) {
    return handleSavedError(res, error, "Save campaign error:");
  }
};

export const removeSavedCampaign = async (req, res) => {
  try {
    const removed = await unsaveCampaign(req.user.id, req.params.campaignId);
    return res.status(200).json({ success: true, removed });
  } catch (error) {
    return handleSavedError(res, error, "Unsave campaign error:");
  }
};

export const getSavedCampaignStatus = async (req, res) => {
  try {
    const saved = await checkSavedCampaign(req.user.id, req.params.campaignId);
    return res.status(200).json({ success: true, saved });
  } catch (error) {
    return handleSavedError(res, error, "Check saved campaign error:");
  }
};

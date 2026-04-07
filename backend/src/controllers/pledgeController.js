import * as PledgeModel from "../models/pledgeModel.js";

export const createPledge = async (req, res) => {
  return res.status(410).json({
    success: false,
    message: "Le parcours de contribution direct a ete remplace par Konnect. Utilisez /api/payments/konnect/init.",
  });
};

export const getMySupportedCampaigns = async (req, res) => {
  try {
    const campaigns = await PledgeModel.findSupportedCampaignsByDonor(req.user.id);

    return res.status(200).json({
      success: true,
      campaigns,
    });
  } catch (error) {
    console.error("Get supported campaigns error:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur interne du serveur.",
    });
  }
};

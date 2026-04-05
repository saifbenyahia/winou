import * as CampaignModel from "../models/campaignModel.js";
import * as PledgeModel from "../models/pledgeModel.js";
import * as UserModel from "../models/userModel.js";
import { sendNewSupportNotification } from "../services/notificationService.js";

export const createPledge = async (req, res) => {
  try {
    const { campaign_id, amount, reward_title } = req.body;

    if (!campaign_id || amount === undefined) {
      return res.status(400).json({
        success: false,
        message: "La campagne et le montant sont obligatoires.",
      });
    }

    const normalizedAmount = parseInt(amount, 10);
    if (Number.isNaN(normalizedAmount) || normalizedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Le montant de contribution doit etre un entier positif en millimes.",
      });
    }

    const campaign = await CampaignModel.findById(campaign_id);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campagne introuvable.",
      });
    }

    if (campaign.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message: "Seules les campagnes actives peuvent recevoir des contributions.",
      });
    }

    // TODO: remplacer cette creation immediate par une integration de paiement reelle
    // (gateway, authorization, webhook de confirmation, gestion d'echec, recus).
    const pledge = await PledgeModel.createPledge({
      campaignId: campaign.id,
      donorId: req.user.id,
      amount: normalizedAmount,
      status: "SUCCESS",
    });

    const donor = await UserModel.findById(req.user.id);
    await sendNewSupportNotification({
      campaign,
      donor,
      amount: normalizedAmount,
    });

    const refreshedCampaign = await CampaignModel.findById(campaign.id);

    return res.status(201).json({
      success: true,
      message: "Contribution enregistree avec succes.",
      pledge: {
        ...pledge,
        reward_title: reward_title || null,
      },
      campaign: refreshedCampaign
        ? {
            id: refreshedCampaign.id,
            amount_raised: refreshedCampaign.amount_raised,
            funded_percent: refreshedCampaign.funded_percent,
            backer_count: refreshedCampaign.backer_count,
          }
        : null,
    });
  } catch (error) {
    console.error("Create pledge error:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur interne du serveur.",
    });
  }
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

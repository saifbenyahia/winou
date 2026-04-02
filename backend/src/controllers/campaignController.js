// ──────────────────────────────────────────────
// Campaign Controller — Business logic for campaigns
// ──────────────────────────────────────────────

import * as CampaignModel from "../models/campaignModel.js";

/**
 * POST /api/campaigns  (Protected)
 * Creates a new draft campaign linked to the authenticated user.
 * Expects: { title, description, category, target_amount }
 */
export const createCampaign = async (req, res) => {
  try {
    const { title, description, category, target_amount } = req.body;

    // ── 1. Validate required fields ────────────────
    if (!title || !description || !category || !target_amount) {
      return res.status(400).json({
        success: false,
        message: "Tous les champs sont obligatoires (title, description, category, target_amount).",
      });
    }

    // ── 2. Validate target_amount is a positive integer (millimes) ──
    const amount = parseInt(target_amount, 10);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Le montant cible doit être un entier positif (en millimes).",
      });
    }

    // ── 3. Create the draft campaign ───────────────
    const campaign = await CampaignModel.create(req.user.id, {
      title,
      description,
      category,
      target_amount: amount,
    });

    // ── 4. Return the campaign ID ──────────────────
    return res.status(201).json({
      success: true,
      message: "Campagne créée en brouillon.",
      campaign_id: campaign.id,
    });
  } catch (error) {
    console.error("Create campaign error:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur interne du serveur.",
    });
  }
};

/**
 * PUT /api/campaigns/:id  (Protected)
 * Updates a draft campaign's editable fields.
 * Only the campaign creator can update.
 * Accepts any subset of: { title, description, category, target_amount }
 */
export const updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    // ── 1. Check campaign exists ───────────────────
    const campaign = await CampaignModel.findById(id);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campagne introuvable.",
      });
    }

    // ── 2. Verify ownership ───────────────────────
    if (campaign.porteur_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Accès interdit. Vous n'êtes pas le créateur de cette campagne.",
      });
    }

    // ── 3. Only DRAFT campaigns can be edited ─────
    if (campaign.status !== "DRAFT") {
      return res.status(403).json({
        success: false,
        message: "Seules les campagnes en brouillon peuvent être modifiées.",
      });
    }

    // ── 4. Validate target_amount if provided ─────
    const fields = {};
    const { title, description, category, target_amount } = req.body;

    if (title !== undefined) fields.title = title;
    if (description !== undefined) fields.description = description;
    if (category !== undefined) fields.category = category;

    if (target_amount !== undefined) {
      const amount = parseInt(target_amount, 10);
      if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Le montant cible doit être un entier positif (en millimes).",
        });
      }
      fields.target_amount = amount;
    }

    if (req.body.rewards !== undefined) {
      fields.rewards = JSON.stringify(req.body.rewards);
    }

    // ── 5. Update the campaign ────────────────────
    const updated = await CampaignModel.update(id, fields);

    return res.status(200).json({
      success: true,
      message: "Campagne mise à jour.",
      campaign: updated,
    });
  } catch (error) {
    console.error("Update campaign error:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur interne du serveur.",
    });
  }
};

/**
 * POST /api/campaigns/:id/submit  (Protected)
 * Submits a draft campaign for admin review (DRAFT → PENDING).
 * Only the campaign creator can submit.
 */
export const submitCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    // ── 1. Check campaign exists ───────────────────
    const campaign = await CampaignModel.findById(id);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campagne introuvable.",
      });
    }

    // ── 2. Verify ownership ───────────────────────
    if (campaign.porteur_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Accès interdit. Vous n'êtes pas le créateur de cette campagne.",
      });
    }

    // ── 3. Only DRAFT campaigns can be submitted ──
    if (campaign.status !== "DRAFT") {
      return res.status(400).json({
        success: false,
        message: "Seules les campagnes en brouillon peuvent être soumises pour révision.",
      });
    }

    // ── 4. Transition to PENDING ──────────────────
    const updated = await CampaignModel.updateStatus(id, "PENDING");

    return res.status(200).json({
      success: true,
      message: "Campagne soumise pour révision par l'administrateur.",
      campaign: {
        id: updated.id,
        status: updated.status,
      },
    });
  } catch (error) {
    console.error("Submit campaign error:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur interne du serveur.",
    });
  }
};

/**
 * GET /api/campaigns  (Public)
 * Returns all campaigns with status 'ACTIVE' for the Discover page.
 */
export const getActiveCampaigns = async (_req, res) => {
  try {
    const campaigns = await CampaignModel.findAllActive();

    return res.status(200).json({
      success: true,
      count: campaigns.length,
      campaigns,
    });
  } catch (error) {
    console.error("Get campaigns error:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur interne du serveur.",
    });
  }
};

/**
 * POST /api/campaigns/:id/media/:type
 * Handles media upload for a given campaign (image or video)
 */
export const uploadMediaCampaign = async (req, res) => {
  try {
    const { id, type } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Aucun fichier fourni." });
    }

    const campaign = await CampaignModel.findById(id);
    if (!campaign) {
      return res.status(404).json({ success: false, message: "Campagne introuvable." });
    }

    if (campaign.porteur_id !== req.user.id) {
      return res.status(403).json({ success: false, message: "Accès interdit." });
    }

    const fileUrl = `/uploads/campaigns/${req.file.filename}`;
    const fields = {};

    if (type === 'image') fields.image_url = fileUrl;
    else if (type === 'video') fields.video_url = fileUrl;
    else return res.status(400).json({ success: false, message: "Type de média invalide." });

    const updated = await CampaignModel.update(id, fields);

    return res.status(200).json({
      success: true,
      message: "Fichier uploadé avec succès.",
      fileUrl,
      campaign: updated
    });
  } catch (error) {
    console.error("Upload media error:", error);
    return res.status(500).json({ success: false, message: "Erreur serveur lors de l'upload." });
  }
};

// ──────────────────────────────────────────────
// Campaign Controller — Business logic for campaigns
// ──────────────────────────────────────────────

import * as CampaignModel from "./campaign.model.js";

/**
 * POST /api/campaigns  (Protected)
 * Creates a new draft campaign linked to the authenticated user.
 * Expects: { title, description, category, target_amount }
 */
export const createCampaign = async (req, res) => {
  try {
    const { title, description, category, target_amount, rewards, story } = req.body;

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
      rewards: rewards !== undefined ? JSON.stringify(rewards) : null,
      story: story !== undefined ? JSON.stringify(story) : null,
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
    const { title, description, category, target_amount, image_url, video_url } = req.body;

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

    if (req.body.story !== undefined) {
      fields.story = JSON.stringify(req.body.story);
    }

    if (image_url !== undefined) {
      fields.image_url = image_url;
      if (image_url) {
        fields.video_url = null;
      }
    }

    if (video_url !== undefined) {
      fields.video_url = video_url;
      if (video_url) {
        fields.image_url = null;
      }
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

    if (!campaign.image_url && !campaign.video_url) {
      return res.status(400).json({
        success: false,
        message: "Ajoutez une image ou une video principale avant de publier votre campagne.",
      });
    }
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

    if (type === 'image') {
      fields.image_url = fileUrl;
      fields.video_url = null;
    } else if (type === 'video') {
      fields.video_url = fileUrl;
      fields.image_url = null;
    }
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

/**
 * GET /api/campaigns/my  (Protected)
 * Returns all campaigns created by the authenticated user.
 */
export const getMyCampaigns = async (req, res) => {
  try {
    const campaigns = await CampaignModel.findByPorteur(req.user.id);
    return res.status(200).json({
      success: true,
      campaigns,
    });
  } catch (error) {
    console.error("Get my campaigns error:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur interne du serveur.",
    });
  }
};

/**
 * GET /api/campaigns/:id
 * Fetches a single campaign by ID
 */
export const getCampaignById = async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await CampaignModel.findById(id);
    if (!campaign) {
      return res.status(404).json({ success: false, message: "Campagne introuvable." });
    }
    return res.status(200).json({ success: true, campaign });
  } catch (error) {
    if (error.code === '22P02') { // Invalid UUID format
      return res.status(404).json({ success: false, message: "Campagne introuvable." });
    }
    console.error("Get campaign by ID error:", error);
    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
};

/**
 * DELETE /api/campaigns/:id (Protected)
 * Deletes a draft campaign owned by the authenticated user.
 */
export const deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await CampaignModel.findById(id);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campagne introuvable.",
      });
    }

    if (campaign.porteur_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Acces interdit. Vous n'etes pas le createur de cette campagne.",
      });
    }

    if (campaign.status !== "DRAFT") {
      return res.status(400).json({
        success: false,
        message: "Seules les campagnes en brouillon peuvent etre supprimees.",
      });
    }

    const deleted = await CampaignModel.deleteDraftByOwner(id, req.user.id);
    if (!deleted) {
      return res.status(400).json({
        success: false,
        message: "Impossible de supprimer ce brouillon.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Brouillon supprime avec succes.",
      campaign: deleted,
    });
  } catch (error) {
    console.error("Delete campaign error:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur interne du serveur.",
    });
  }
};

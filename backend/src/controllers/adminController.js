// ──────────────────────────────────────────────
// Admin Controller — Dashboard KPIs & Moderation
// ──────────────────────────────────────────────

import * as AdminModel from "../models/adminModel.js";
import * as CampaignModel from "../models/campaignModel.js";
import * as UserModel from "../models/userModel.js";
import {
  sendCampaignApprovedNotification,
  sendCampaignRejectedNotification,
} from "../services/notificationService.js";

/**
 * GET /api/admin/stats
 * Returns platform KPI statistics.
 */
export const getStats = async (_req, res) => {
  try {
    const stats = await AdminModel.getStats();
    return res.status(200).json({ success: true, stats });
  } catch (error) {
    console.error("Admin stats error:", error);
    return res.status(500).json({ success: false, message: "Erreur interne du serveur." });
  }
};

/**
 * GET /api/admin/campaigns/pending
 * Returns all campaigns awaiting moderation.
 */
export const getPendingCampaigns = async (_req, res) => {
  try {
    const campaigns = await AdminModel.getPendingCampaigns();
    return res.status(200).json({ success: true, count: campaigns.length, campaigns });
  } catch (error) {
    console.error("Pending campaigns error:", error);
    return res.status(500).json({ success: false, message: "Erreur interne du serveur." });
  }
};

/**
 * GET /api/admin/campaigns
 * Returns all platform campaigns with their current status.
 */
export const getAllCampaigns = async (_req, res) => {
  try {
    const campaigns = await AdminModel.getAllCampaigns();
    return res.status(200).json({ success: true, count: campaigns.length, campaigns });
  } catch (error) {
    console.error("All campaigns error:", error);
    return res.status(500).json({ success: false, message: "Erreur interne du serveur." });
  }
};

/**
 * GET /api/admin/users
 * Returns all platform users.
 */
export const getUsers = async (_req, res) => {
  try {
    const users = await AdminModel.getAllUsers();
    return res.status(200).json({ success: true, count: users.length, users });
  } catch (error) {
    console.error("Users list error:", error);
    return res.status(500).json({ success: false, message: "Erreur interne du serveur." });
  }
};

/**
 * GET /api/admin/pledges
 * Returns all recorded supports/pledges with donor and campaign details.
 */
export const getPledges = async (_req, res) => {
  try {
    const pledges = await AdminModel.getAllPledges();
    return res.status(200).json({ success: true, count: pledges.length, pledges });
  } catch (error) {
    console.error("Admin pledges error:", error);
    return res.status(500).json({ success: false, message: "Erreur interne du serveur." });
  }
};

/**
 * POST /api/admin/campaigns/:id/approve
 * Approves a pending campaign (PENDING → ACTIVE).
 */
export const approveCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const existingCampaign = await CampaignModel.findById(id);
    const campaign = await AdminModel.approveCampaign(id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campagne introuvable ou déjà traitée.",
      });
    }

    if (existingCampaign) {
      await sendCampaignApprovedNotification(existingCampaign);
    }

    return res.status(200).json({
      success: true,
      message: `Campagne "${campaign.title}" approuvée et maintenant ACTIVE.`,
      campaign,
    });
  } catch (error) {
    console.error("Approve campaign error:", error);
    return res.status(500).json({ success: false, message: "Erreur interne du serveur." });
  }
};

/**
 * POST /api/admin/campaigns/:id/reject
 * Rejects a pending campaign (PENDING → REJECTED).
 */
export const rejectCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const existingCampaign = await CampaignModel.findById(id);
    const campaign = await AdminModel.rejectCampaign(id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campagne introuvable ou déjà traitée.",
      });
    }

    if (existingCampaign) {
      await sendCampaignRejectedNotification(existingCampaign);
    }

    return res.status(200).json({
      success: true,
      message: `Campagne "${campaign.title}" refusée.`,
      campaign,
    });
  } catch (error) {
    console.error("Reject campaign error:", error);
    return res.status(500).json({ success: false, message: "Erreur interne du serveur." });
  }
};

/**
 * DELETE /api/admin/users/:id
 * Deletes a user and all their campaigns.
 * Admin cannot delete themselves.
 */
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "Vous ne pouvez pas supprimer votre propre compte.",
      });
    }

    const user = await AdminModel.deleteUser(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "Utilisateur introuvable." });
    }

    return res.status(200).json({
      success: true,
      message: `Utilisateur "${user.name}" et toutes ses campagnes ont été supprimés.`,
    });
  } catch (error) {
    console.error("Delete user error:", error);
    if (error.code === "23503") {
      return res.status(409).json({
        success: false,
        message: "Impossible de supprimer cet utilisateur car il est lie a des donations ou a des paiements existants.",
      });
    }
    return res.status(500).json({ success: false, message: "Erreur interne du serveur." });
  }
};

/**
 * PUT /api/admin/users/:id/role
 * Toggles a user's role between USER and ADMIN.
 */
export const changeUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !["USER", "ADMIN"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Le rôle doit être 'USER' ou 'ADMIN'.",
      });
    }

    // Prevent admin from downgrading themselves
    if (id === req.user.id && role !== "ADMIN") {
      return res.status(400).json({
        success: false,
        message: "Vous ne pouvez pas retirer vos propres droits d'administrateur.",
      });
    }

    const user = await AdminModel.updateUserRole(id, role);
    if (!user) {
      return res.status(404).json({ success: false, message: "Utilisateur introuvable." });
    }

    return res.status(200).json({
      success: true,
      message: `Rôle de "${user.name}" mis à jour en ${role}.`,
      user,
    });
  } catch (error) {
    console.error("Change role error:", error);
    return res.status(500).json({ success: false, message: "Erreur interne du serveur." });
  }
};

/**
 * PUT /api/admin/users/:id/name
 * Updates a user's display name.
 */
export const updateUserName = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Le nom ne peut pas être vide.",
      });
    }

    const user = await AdminModel.updateUserName(id, name.trim());
    if (!user) {
      return res.status(404).json({ success: false, message: "Utilisateur introuvable." });
    }

    return res.status(200).json({
      success: true,
      message: `Nom mis à jour en "${user.name}".`,
      user,
    });
  } catch (error) {
    console.error("Update name error:", error);
    return res.status(500).json({ success: false, message: "Erreur interne du serveur." });
  }
};

/**
 * PUT /api/admin/users/:id
 * Allows an admin to edit a user's profile fields and role.
 */
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, bio, avatar } = req.body;

    const user = await UserModel.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "Utilisateur introuvable." });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Le nom ne peut pas etre vide." });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: "L'email ne peut pas etre vide." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ success: false, message: "Format d'email invalide." });
    }

    if (!role || !["USER", "ADMIN"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Le role doit etre 'USER' ou 'ADMIN'.",
      });
    }

    if (id === req.user.id && role !== "ADMIN") {
      return res.status(400).json({
        success: false,
        message: "Vous ne pouvez pas retirer vos propres droits d'administrateur.",
      });
    }

    if (email.trim() !== user.email) {
      const existing = await UserModel.findByEmail(email.trim());
      if (existing && existing.id !== id) {
        return res.status(409).json({
          success: false,
          message: "Un compte avec cet email existe deja.",
        });
      }
    }

    const updated = await AdminModel.updateUser(id, {
      name: name.trim(),
      email: email.trim(),
      role,
      bio: bio !== undefined ? bio : "",
      avatar: avatar !== undefined ? avatar : "",
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: "Utilisateur introuvable." });
    }

    return res.status(200).json({
      success: true,
      message: `Informations de "${updated.name}" mises a jour avec succes.`,
      user: updated,
    });
  } catch (error) {
    console.error("Update user error:", error);
    return res.status(500).json({ success: false, message: "Erreur interne du serveur." });
  }
};

/**
 * PUT /api/admin/campaigns/:id
 * Allows an admin to edit the basic information of an accepted campaign.
 */
export const updateAcceptedCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await CampaignModel.findById(id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campagne introuvable.",
      });
    }

    if (campaign.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "Seules les campagnes acceptÃ©es et actives peuvent Ãªtre modifiÃ©es par l'administrateur.",
      });
    }

    const { title, description, category, target_amount, image_url, video_url } = req.body;
    const fields = {};

    if (title !== undefined) fields.title = title;
    if (description !== undefined) fields.description = description;
    if (category !== undefined) fields.category = category;
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

    if (target_amount !== undefined) {
      const amount = parseInt(target_amount, 10);
      if (Number.isNaN(amount) || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Le montant cible doit Ãªtre un entier positif (en millimes).",
        });
      }
      fields.target_amount = amount;
    }

    const updated = await CampaignModel.update(id, fields);

    return res.status(200).json({
      success: true,
      message: "Campagne active mise Ã  jour avec succÃ¨s.",
      campaign: updated,
    });
  } catch (error) {
    console.error("Update accepted campaign error:", error);
    return res.status(500).json({ success: false, message: "Erreur interne du serveur." });
  }
};

/**
 * POST /api/admin/campaigns/:id/image
 * Allows an admin to replace the image of an active campaign.
 */
export const updateAcceptedCampaignImage = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Aucun fichier image fourni.",
      });
    }

    const campaign = await CampaignModel.findById(id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campagne introuvable.",
      });
    }

    if (campaign.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "Seules les campagnes actives peuvent recevoir une nouvelle image depuis l'administration.",
      });
    }

    const fileUrl = `/uploads/campaigns/${req.file.filename}`;
    const updated = await CampaignModel.update(id, { image_url: fileUrl, video_url: null });

    return res.status(200).json({
      success: true,
      message: "Image de la campagne mise a jour avec succes.",
      fileUrl,
      campaign: updated,
    });
  } catch (error) {
    console.error("Update accepted campaign image error:", error);
    return res.status(500).json({ success: false, message: "Erreur interne du serveur." });
  }
};

/**
 * POST /api/admin/campaigns/:id/video
 * Allows an admin to replace the video of an active campaign.
 */
export const updateAcceptedCampaignVideo = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Aucun fichier video fourni.",
      });
    }

    const campaign = await CampaignModel.findById(id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campagne introuvable.",
      });
    }

    if (campaign.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "Seules les campagnes actives peuvent recevoir une nouvelle video depuis l'administration.",
      });
    }

    const fileUrl = `/uploads/campaigns/${req.file.filename}`;
    const updated = await CampaignModel.update(id, { video_url: fileUrl, image_url: null });

    return res.status(200).json({
      success: true,
      message: "Video de la campagne mise a jour avec succes.",
      fileUrl,
      campaign: updated,
    });
  } catch (error) {
    console.error("Update accepted campaign video error:", error);
    return res.status(500).json({ success: false, message: "Erreur interne du serveur." });
  }
};

/**
 * DELETE /api/admin/campaigns/:id
 * Allows an admin to delete draft, pending or active campaigns.
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

    if (!["DRAFT", "PENDING", "ACTIVE"].includes(campaign.status)) {
      return res.status(403).json({
        success: false,
        message: "Seules les campagnes en brouillon, en attente ou actives peuvent etre supprimees par l'administrateur.",
      });
    }

    const deleted = await AdminModel.deleteCampaign(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Campagne introuvable ou deja supprimee.",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Campagne "${deleted.title}" supprimee avec succes.`,
    });
  } catch (error) {
    console.error("Delete campaign error:", error);
    if (error.code === "23503") {
      return res.status(409).json({
        success: false,
        message: "Impossible de supprimer cette campagne car elle possede deja des donations ou des paiements relies.",
      });
    }
    return res.status(500).json({ success: false, message: "Erreur interne du serveur." });
  }
};

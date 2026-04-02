// ──────────────────────────────────────────────
// Admin Controller — Dashboard KPIs & Moderation
// ──────────────────────────────────────────────

import * as AdminModel from "../models/adminModel.js";

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
 * POST /api/admin/campaigns/:id/approve
 * Approves a pending campaign (PENDING → ACTIVE).
 */
export const approveCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await AdminModel.approveCampaign(id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campagne introuvable ou déjà traitée.",
      });
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
    const campaign = await AdminModel.rejectCampaign(id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campagne introuvable ou déjà traitée.",
      });
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

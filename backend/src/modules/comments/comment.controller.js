import * as CampaignModel from "../campaigns/campaign.model.js";
import * as CommentModel from "./comment.model.js";
import * as UserModel from "../auth/auth.model.js";
import { sendNewCommentNotification } from "../notifications/notification.service.js";

const normalizeCommentContent = (value) => String(value || "").trim();

export const createCampaignComment = async (req, res) => {
  try {
    const { id } = req.params;
    const content = normalizeCommentContent(req.body?.content);

    if (!content) {
      return res.status(400).json({
        success: false,
        message: "Le commentaire ne peut pas etre vide.",
      });
    }

    if (content.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Le commentaire ne peut pas depasser 1000 caracteres.",
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
        message: "Les commentaires sont disponibles uniquement sur les campagnes actives.",
      });
    }

    const comment = await CommentModel.createComment({
      campaignId: id,
      userId: req.user.id,
      content,
    });

    const author = await UserModel.findById(req.user.id);
    await sendNewCommentNotification({
      campaign,
      author,
      content,
    });

    return res.status(201).json({
      success: true,
      message: "Commentaire publie avec succes.",
      comment,
    });
  } catch (error) {
    console.error("Create comment error:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur interne du serveur.",
    });
  }
};

export const getCampaignComments = async (req, res) => {
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
        message: "Les commentaires publics sont disponibles uniquement pour une campagne active.",
      });
    }

    const comments = await CommentModel.getPublicCommentsByCampaign(id);

    return res.status(200).json({
      success: true,
      count: comments.length,
      comments,
    });
  } catch (error) {
    console.error("Get campaign comments error:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur interne du serveur.",
    });
  }
};

export const getAdminCampaignComments = async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await CampaignModel.findById(id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campagne introuvable.",
      });
    }

    const comments = await CommentModel.getAdminCommentsByCampaign(id);

    return res.status(200).json({
      success: true,
      campaign: {
        id: campaign.id,
        title: campaign.title,
        status: campaign.status,
      },
      count: comments.length,
      comments,
    });
  } catch (error) {
    console.error("Admin get campaign comments error:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur interne du serveur.",
    });
  }
};

export const deleteAdminComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const comment = await CommentModel.getCommentById(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Commentaire introuvable.",
      });
    }

    if (comment.is_deleted) {
      return res.status(400).json({
        success: false,
        message: "Ce commentaire a deja ete supprime.",
      });
    }

    const deleted = await CommentModel.softDeleteComment(commentId);
    if (!deleted) {
      return res.status(400).json({
        success: false,
        message: "Impossible de supprimer ce commentaire.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Commentaire supprime avec succes.",
      comment: {
        ...comment,
        is_deleted: true,
      },
    });
  } catch (error) {
    console.error("Admin delete comment error:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur interne du serveur.",
    });
  }
};

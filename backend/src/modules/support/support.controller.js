import * as CampaignModel from "../campaigns/campaign.model.js";
import * as SupportModel from "./support.model.js";
import * as UserModel from "../auth/auth.model.js";
import { sendSupportTicketCreatedNotification } from "../notifications/notification.service.js";

const normalizeText = (value) => String(value || "").trim();

const buildAttachmentPayload = (file) => {
  if (!file) {
    return {
      attachmentUrl: null,
      attachmentName: null,
    };
  }

  return {
    attachmentUrl: `/uploads/support/${file.filename}`,
    attachmentName: file.originalname || file.filename,
  };
};

const handleSupportError = (res, error, fallbackLogLabel) => {
  if (error?.code === "22P02") {
    return res.status(404).json({
      success: false,
      message: "Ticket introuvable.",
    });
  }

  if (error?.statusCode) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
  }

  console.error(fallbackLogLabel, error);
  return res.status(500).json({
    success: false,
    message: "Erreur interne du serveur.",
  });
};

export const createSupportTicket = async (req, res) => {
  try {
    const title = normalizeText(req.body?.title);
    const category = normalizeText(req.body?.category || "GENERAL").toUpperCase();
    const priority = normalizeText(req.body?.priority || "MEDIUM").toUpperCase();
    const message = normalizeText(req.body?.message);
    const relatedCampaignId = normalizeText(req.body?.related_campaign_id) || null;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Le titre du ticket est obligatoire.",
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Le message initial est obligatoire.",
      });
    }

    if (message.length > 4000) {
      return res.status(400).json({
        success: false,
        message: "Le message ne peut pas depasser 4000 caracteres.",
      });
    }

    if (!SupportModel.SUPPORT_TICKET_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: "Categorie de ticket invalide.",
      });
    }

    if (!SupportModel.SUPPORT_TICKET_PRIORITIES.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: "Priorite de ticket invalide.",
      });
    }

    if (relatedCampaignId) {
      const campaign = await CampaignModel.findById(relatedCampaignId);
      if (!campaign) {
        return res.status(404).json({
          success: false,
          message: "La campagne liee est introuvable.",
        });
      }
    }

    const user = await UserModel.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable.",
      });
    }

    const { attachmentUrl, attachmentName } = buildAttachmentPayload(req.file);

    const ticketId = await SupportModel.createTicket({
      userId: req.user.id,
      userName: user.name || "Utilisateur Hive.tn",
      title,
      category,
      priority,
      message,
      relatedCampaignId,
      attachmentUrl,
      attachmentName,
    });

    const ticket = await SupportModel.getUserTicketById(ticketId, req.user.id);
    const messages = await SupportModel.getTicketMessages(ticketId);

    await sendSupportTicketCreatedNotification(ticket);

    return res.status(201).json({
      success: true,
      message: "Votre ticket support a ete cree avec succes.",
      ticket: {
        ...ticket,
        messages,
      },
    });
  } catch (error) {
    return handleSupportError(res, error, "Create support ticket error:");
  }
};

export const getMySupportTickets = async (req, res) => {
  try {
    const result = await SupportModel.listUserTickets({
      userId: req.user.id,
      search: normalizeText(req.query?.search),
      status: normalizeText(req.query?.status).toUpperCase(),
      category: normalizeText(req.query?.category).toUpperCase(),
      sortBy: normalizeText(req.query?.sort_by) || "last_message_at",
      sortDir: normalizeText(req.query?.sort_dir) || "DESC",
      page: req.query?.page,
      limit: req.query?.limit,
    });

    return res.status(200).json({
      success: true,
      tickets: result.tickets,
      summary: result.summary,
      pagination: result.pagination,
    });
  } catch (error) {
    return handleSupportError(res, error, "Get my support tickets error:");
  }
};

export const getMySupportTicket = async (req, res) => {
  try {
    const ticket = await SupportModel.getUserTicketById(req.params.id, req.user.id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket introuvable.",
      });
    }

    const messages = await SupportModel.getTicketMessages(ticket.id);

    return res.status(200).json({
      success: true,
      ticket: {
        ...ticket,
        messages,
      },
    });
  } catch (error) {
    return handleSupportError(res, error, "Get my support ticket error:");
  }
};

export const addSupportTicketMessage = async (req, res) => {
  try {
    const ticket = await SupportModel.getUserTicketById(req.params.id, req.user.id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket introuvable.",
      });
    }

    const message = normalizeText(req.body?.message);
    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Le message est obligatoire.",
      });
    }

    if (message.length > 4000) {
      return res.status(400).json({
        success: false,
        message: "Le message ne peut pas depasser 4000 caracteres.",
      });
    }

    const user = await UserModel.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable.",
      });
    }

    const { attachmentUrl, attachmentName } = buildAttachmentPayload(req.file);

    await SupportModel.addMessage({
      ticketId: ticket.id,
      senderId: req.user.id,
      senderRole: "USER",
      senderName: user.name || "Utilisateur Hive.tn",
      message,
      attachmentUrl,
      attachmentName,
    });

    const updatedTicket = await SupportModel.getUserTicketById(ticket.id, req.user.id);
    const messages = await SupportModel.getTicketMessages(ticket.id);

    return res.status(201).json({
      success: true,
      message: "Votre reponse a ete envoyee.",
      ticket: {
        ...updatedTicket,
        messages,
      },
    });
  } catch (error) {
    return handleSupportError(res, error, "Add user support ticket message error:");
  }
};

export const closeSupportTicket = async (req, res) => {
  try {
    const ticket = await SupportModel.getUserTicketById(req.params.id, req.user.id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket introuvable.",
      });
    }

    if (ticket.status === "CLOSED") {
      return res.status(400).json({
        success: false,
        message: "Ce ticket est deja ferme.",
      });
    }

    await SupportModel.closeTicketByUser(ticket.id, req.user.id);
    const updatedTicket = await SupportModel.getUserTicketById(ticket.id, req.user.id);
    const messages = await SupportModel.getTicketMessages(ticket.id);

    return res.status(200).json({
      success: true,
      message: "Le ticket a ete ferme.",
      ticket: {
        ...updatedTicket,
        messages,
      },
    });
  } catch (error) {
    return handleSupportError(res, error, "Close support ticket error:");
  }
};

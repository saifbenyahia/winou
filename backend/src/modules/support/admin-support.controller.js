import * as SupportModel from "./support.model.js";
import * as UserModel from "../auth/auth.model.js";
import {
  sendSupportReplyNotification,
  sendSupportStatusNotification,
} from "../notifications/notification.service.js";

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

const loadAdminTicketPayload = async (ticketId) => {
  const [ticket, messages, internalNotes, admins] = await Promise.all([
    SupportModel.getAdminTicketById(ticketId),
    SupportModel.getTicketMessages(ticketId),
    SupportModel.getTicketInternalNotes(ticketId),
    SupportModel.getAssignableAdmins(),
  ]);

  return {
    ticket,
    messages,
    internalNotes,
    admins,
  };
};

export const getAdminSupportTickets = async (req, res) => {
  try {
    const result = await SupportModel.listAdminTickets({
      search: normalizeText(req.query?.search),
      status: normalizeText(req.query?.status).toUpperCase(),
      category: normalizeText(req.query?.category).toUpperCase(),
      priority: normalizeText(req.query?.priority).toUpperCase(),
      assignedAdminId: normalizeText(req.query?.assigned_admin_id),
      dateFrom: normalizeText(req.query?.date_from),
      dateTo: normalizeText(req.query?.date_to),
      sortBy: normalizeText(req.query?.sort_by) || "last_message_at",
      sortDir: normalizeText(req.query?.sort_dir) || "DESC",
      page: req.query?.page,
      limit: req.query?.limit,
    });

    return res.status(200).json({
      success: true,
      tickets: result.tickets,
      admins: result.admins,
      summary: result.summary,
      pagination: result.pagination,
    });
  } catch (error) {
    return handleSupportError(res, error, "Get admin support tickets error:");
  }
};

export const getAdminSupportTicket = async (req, res) => {
  try {
    const payload = await loadAdminTicketPayload(req.params.id);

    if (!payload.ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket introuvable.",
      });
    }

    return res.status(200).json({
      success: true,
      ticket: {
        ...payload.ticket,
        messages: payload.messages,
        internal_notes: payload.internalNotes,
      },
      admins: payload.admins,
    });
  } catch (error) {
    return handleSupportError(res, error, "Get admin support ticket error:");
  }
};

export const addAdminSupportTicketMessage = async (req, res) => {
  try {
    const ticket = await SupportModel.getAdminTicketById(req.params.id);
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

    const nextStatus = normalizeText(req.body?.next_status).toUpperCase();
    if (nextStatus && !SupportModel.SUPPORT_TICKET_STATUSES.includes(nextStatus)) {
      return res.status(400).json({
        success: false,
        message: "Statut de ticket invalide.",
      });
    }

    const admin = await UserModel.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Administrateur introuvable.",
      });
    }

    const { attachmentUrl, attachmentName } = buildAttachmentPayload(req.file);

    await SupportModel.addMessage({
      ticketId: ticket.id,
      senderId: req.user.id,
      senderRole: "ADMIN",
      senderName: admin.name || "Support Hive.tn",
      message,
      attachmentUrl,
      attachmentName,
      nextStatus: nextStatus || null,
    });

    const updatedPayload = await loadAdminTicketPayload(ticket.id);

    await sendSupportReplyNotification({
      ticket: updatedPayload.ticket,
      authorName: admin.name || "Support Hive.tn",
    });

    if (nextStatus && nextStatus !== ticket.status) {
      await sendSupportStatusNotification({
        ticket: updatedPayload.ticket,
        status: nextStatus,
      });
    }

    return res.status(201).json({
      success: true,
      message: "La reponse support a ete envoyee.",
      ticket: {
        ...updatedPayload.ticket,
        messages: updatedPayload.messages,
        internal_notes: updatedPayload.internalNotes,
      },
      admins: updatedPayload.admins,
    });
  } catch (error) {
    return handleSupportError(res, error, "Add admin support ticket message error:");
  }
};

export const updateAdminSupportTicket = async (req, res) => {
  try {
    const ticket = await SupportModel.getAdminTicketById(req.params.id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket introuvable.",
      });
    }

    const status = normalizeText(req.body?.status).toUpperCase();
    const priority = normalizeText(req.body?.priority).toUpperCase();
    const category = normalizeText(req.body?.category).toUpperCase();

    if (!status && !priority && !category) {
      return res.status(400).json({
        success: false,
        message: "Aucune modification a appliquer.",
      });
    }

    if (status && !SupportModel.SUPPORT_TICKET_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Statut de ticket invalide.",
      });
    }

    if (priority && !SupportModel.SUPPORT_TICKET_PRIORITIES.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: "Priorite de ticket invalide.",
      });
    }

    if (category && !SupportModel.SUPPORT_TICKET_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: "Categorie de ticket invalide.",
      });
    }

    await SupportModel.updateTicketByAdmin(ticket.id, {
      status: status || undefined,
      priority: priority || undefined,
      category: category || undefined,
    });

    const updatedPayload = await loadAdminTicketPayload(ticket.id);

    if (status && status !== ticket.status) {
      await sendSupportStatusNotification({
        ticket: updatedPayload.ticket,
        status,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Le ticket a ete mis a jour.",
      ticket: {
        ...updatedPayload.ticket,
        messages: updatedPayload.messages,
        internal_notes: updatedPayload.internalNotes,
      },
      admins: updatedPayload.admins,
    });
  } catch (error) {
    return handleSupportError(res, error, "Update admin support ticket error:");
  }
};

export const assignAdminSupportTicket = async (req, res) => {
  try {
    const ticket = await SupportModel.getAdminTicketById(req.params.id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket introuvable.",
      });
    }

    const assignedAdminId = normalizeText(req.body?.assigned_admin_id) || null;
    if (assignedAdminId) {
      const adminUser = await UserModel.findById(assignedAdminId);
      if (!adminUser || adminUser.role !== "ADMIN") {
        return res.status(400).json({
          success: false,
          message: "Administrateur cible invalide.",
        });
      }
    }

    await SupportModel.assignTicketToAdmin(ticket.id, assignedAdminId);
    const updatedPayload = await loadAdminTicketPayload(ticket.id);

    return res.status(200).json({
      success: true,
      message: assignedAdminId ? "Le ticket a ete assigne." : "L'assignation a ete retiree.",
      ticket: {
        ...updatedPayload.ticket,
        messages: updatedPayload.messages,
        internal_notes: updatedPayload.internalNotes,
      },
      admins: updatedPayload.admins,
    });
  } catch (error) {
    return handleSupportError(res, error, "Assign admin support ticket error:");
  }
};

export const addAdminSupportTicketNote = async (req, res) => {
  try {
    const ticket = await SupportModel.getAdminTicketById(req.params.id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket introuvable.",
      });
    }

    const note = normalizeText(req.body?.note);
    if (!note) {
      return res.status(400).json({
        success: false,
        message: "La note interne est obligatoire.",
      });
    }

    if (note.length > 4000) {
      return res.status(400).json({
        success: false,
        message: "La note ne peut pas depasser 4000 caracteres.",
      });
    }

    const admin = await UserModel.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Administrateur introuvable.",
      });
    }

    const internalNote = await SupportModel.addInternalNote({
      ticketId: ticket.id,
      adminId: req.user.id,
      adminName: admin.name || "Support Hive.tn",
      note,
    });

    return res.status(201).json({
      success: true,
      message: "La note interne a ete ajoutee.",
      internalNote,
    });
  } catch (error) {
    return handleSupportError(res, error, "Add admin support ticket note error:");
  }
};

import * as NotificationModel from "./notification.model.js";

export const getMyNotifications = async (req, res) => {
  try {
    const notifications = await NotificationModel.getNotificationsByUser(req.user.id);
    const unreadCount = await NotificationModel.getUnreadCount(req.user.id);

    return res.status(200).json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur interne du serveur.",
    });
  }
};

export const markNotificationAsRead = async (req, res) => {
  try {
    const notification = await NotificationModel.markAsRead(req.params.id, req.user.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification introuvable.",
      });
    }

    const unreadCount = await NotificationModel.getUnreadCount(req.user.id);
    return res.status(200).json({
      success: true,
      notification,
      unreadCount,
    });
  } catch (error) {
    console.error("Mark notification read error:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur interne du serveur.",
    });
  }
};

export const markAllNotificationsAsRead = async (req, res) => {
  try {
    await NotificationModel.markAllAsRead(req.user.id);
    return res.status(200).json({
      success: true,
      unreadCount: 0,
    });
  } catch (error) {
    console.error("Mark all notifications read error:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur interne du serveur.",
    });
  }
};

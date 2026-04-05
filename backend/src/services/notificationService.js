import * as NotificationModel from "../models/notificationModel.js";

export const sendWelcomeNotification = async (user) => {
  if (!user?.id) return null;
  return NotificationModel.createNotification({
    userId: user.id,
    type: "WELCOME",
    title: "Bienvenue sur Hive.tn",
    message: "Votre compte est pret. Decouvrez des campagnes, soutenez des createurs et lancez vos propres projets.",
    link: "/discover",
  });
};

export const sendCampaignApprovedNotification = async (campaign) => {
  if (!campaign?.porteur_id) return null;
  return NotificationModel.createNotification({
    userId: campaign.porteur_id,
    type: "CAMPAIGN_APPROVED",
    title: "Campagne acceptee",
    message: `Votre campagne "${campaign.title}" a ete acceptee par l'administration et est maintenant active.`,
    link: `/project/${campaign.id}`,
  });
};

export const sendCampaignRejectedNotification = async (campaign) => {
  if (!campaign?.porteur_id) return null;
  return NotificationModel.createNotification({
    userId: campaign.porteur_id,
    type: "CAMPAIGN_REJECTED",
    title: "Campagne refusee",
    message: `Votre campagne "${campaign.title}" a ete refusee par l'administration. Vous pouvez la revoir depuis l'editeur.`,
    link: `/editor/${campaign.id}`,
  });
};

export const sendNewSupportNotification = async ({ campaign, donor, amount }) => {
  if (!campaign?.porteur_id || !donor?.id) return null;
  if (campaign.porteur_id === donor.id) return null;

  const amountTnd = `${(Number(amount || 0) / 1000).toLocaleString("fr-FR")} DT`;

  return NotificationModel.createNotification({
    userId: campaign.porteur_id,
    type: "NEW_SUPPORT",
    title: "Nouveau soutien recu",
    message: `${donor.name || "Un utilisateur"} a soutenu votre campagne "${campaign.title}" pour ${amountTnd}.`,
    link: `/project/${campaign.id}`,
  });
};

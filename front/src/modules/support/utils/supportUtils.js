import { API_URL } from "../../../shared/services/api.js";

export { API_URL };

export const supportStatusMeta = {
  OPEN: {
    label: "Ouvert",
    className: "support-badge--open",
  },
  IN_PROGRESS: {
    label: "En cours",
    className: "support-badge--progress",
  },
  WAITING_USER: {
    label: "En attente client",
    className: "support-badge--waiting",
  },
  RESOLVED: {
    label: "Resolu",
    className: "support-badge--resolved",
  },
  CLOSED: {
    label: "Ferme",
    className: "support-badge--closed",
  },
};

export const supportPriorityMeta = {
  LOW: {
    label: "Faible",
    className: "support-badge--priority-low",
  },
  MEDIUM: {
    label: "Moyenne",
    className: "support-badge--priority-medium",
  },
  HIGH: {
    label: "Haute",
    className: "support-badge--priority-high",
  },
  URGENT: {
    label: "Urgente",
    className: "support-badge--priority-urgent",
  },
};

export const supportCategoryOptions = [
  { value: "GENERAL", label: "General" },
  { value: "CAMPAIGN", label: "Campagne" },
  { value: "PAYMENT", label: "Paiement" },
  { value: "ACCOUNT", label: "Compte" },
  { value: "TECHNICAL", label: "Technique" },
  { value: "REPORT_ABUSE", label: "Signaler un abus" },
  { value: "OTHER", label: "Autre" },
];

export const supportPriorityOptions = [
  { value: "LOW", label: "Faible" },
  { value: "MEDIUM", label: "Moyenne" },
  { value: "HIGH", label: "Haute" },
  { value: "URGENT", label: "Urgente" },
];

export const supportStatusOptions = [
  { value: "OPEN", label: "Ouvert" },
  { value: "IN_PROGRESS", label: "En cours" },
  { value: "WAITING_USER", label: "En attente client" },
  { value: "RESOLVED", label: "Resolu" },
  { value: "CLOSED", label: "Ferme" },
];

export const userSupportSortOptions = [
  { value: "last_message_at:DESC", label: "Activite recente" },
  { value: "created_at:DESC", label: "Plus recents" },
  { value: "created_at:ASC", label: "Plus anciens" },
  { value: "priority:ASC", label: "Priorite la plus haute" },
  { value: "status:ASC", label: "Par statut" },
];

export const adminSupportSortOptions = [
  { value: "last_message_at:DESC", label: "A traiter en premier" },
  { value: "created_at:DESC", label: "Plus recents" },
  { value: "priority:ASC", label: "Priorite la plus haute" },
  { value: "status:ASC", label: "Par statut" },
  { value: "updated_at:DESC", label: "Derniere mise a jour" },
];

export const formatSupportDate = (value, withTime = true) => {
  if (!value) return "Non disponible";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Non disponible";

  return date.toLocaleString("fr-FR", withTime ? {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  } : {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const formatSupportDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

export const resolveMediaUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  return `${API_URL}${url}`;
};

export const getStatusMeta = (status) => supportStatusMeta[status] || {
  label: status || "Inconnu",
  className: "support-badge--closed",
};

export const getPriorityMeta = (priority) => supportPriorityMeta[priority] || {
  label: priority || "Normale",
  className: "support-badge--priority-medium",
};

export const getCategoryLabel = (category) => (
  supportCategoryOptions.find((option) => option.value === category)?.label || category || "General"
);

export const getInitials = (name = "U") => (
  String(name)
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
);

export const getSortParts = (value, fallback = "last_message_at:DESC") => {
  const [sortBy, sortDir] = String(value || fallback).split(":");
  return {
    sortBy: sortBy || "last_message_at",
    sortDir: sortDir || "DESC",
  };
};

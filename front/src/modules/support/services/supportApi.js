import {
  API_URL,
  getSortParts,
} from "../utils/supportUtils.js";

const buildQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    searchParams.set(key, value);
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
};

const apiRequest = async (path, { method = "GET", body, isFormData = false } = {}) => {
  const token = localStorage.getItem("token");
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  });

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok || data.success === false) {
    const error = new Error(data.message || "Une erreur est survenue.");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

const buildTicketFormData = (payload) => {
  const formData = new FormData();

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    formData.append(key, value);
  });

  return formData;
};

export const listUserSupportTickets = async ({ search, status, category, sortValue, page = 1 }) => {
  const { sortBy, sortDir } = getSortParts(sortValue);

  return apiRequest(`/api/support/tickets${buildQueryString({
    search,
    status,
    category,
    sort_by: sortBy,
    sort_dir: sortDir,
    page,
    limit: 12,
  })}`);
};

export const getUserSupportTicket = async (ticketId) => apiRequest(`/api/support/tickets/${ticketId}`);

export const createSupportTicket = async (payload) => apiRequest("/api/support/tickets", {
  method: "POST",
  body: buildTicketFormData(payload),
  isFormData: true,
});

export const replyToSupportTicket = async (ticketId, payload) => apiRequest(`/api/support/tickets/${ticketId}/messages`, {
  method: "POST",
  body: buildTicketFormData(payload),
  isFormData: true,
});

export const closeSupportTicket = async (ticketId) => apiRequest(`/api/support/tickets/${ticketId}/close`, {
  method: "PATCH",
});

export const listAdminSupportTickets = async ({
  search,
  status,
  category,
  priority,
  assignedAdminId,
  dateFrom,
  dateTo,
  sortValue,
  page = 1,
}) => {
  const { sortBy, sortDir } = getSortParts(sortValue);

  return apiRequest(`/api/admin/support/tickets${buildQueryString({
    search,
    status,
    category,
    priority,
    assigned_admin_id: assignedAdminId,
    date_from: dateFrom,
    date_to: dateTo,
    sort_by: sortBy,
    sort_dir: sortDir,
    page,
    limit: 15,
  })}`);
};

export const getAdminSupportTicket = async (ticketId) => apiRequest(`/api/admin/support/tickets/${ticketId}`);

export const replyToAdminSupportTicket = async (ticketId, payload) => apiRequest(`/api/admin/support/tickets/${ticketId}/messages`, {
  method: "POST",
  body: buildTicketFormData(payload),
  isFormData: true,
});

export const updateAdminSupportTicket = async (ticketId, payload) => apiRequest(`/api/admin/support/tickets/${ticketId}`, {
  method: "PATCH",
  body: payload,
});

export const assignAdminSupportTicket = async (ticketId, assignedAdminId) => apiRequest(`/api/admin/support/tickets/${ticketId}/assign`, {
  method: "PATCH",
  body: {
    assigned_admin_id: assignedAdminId,
  },
});

export const addAdminSupportTicketNote = async (ticketId, note) => apiRequest(`/api/admin/support/tickets/${ticketId}/notes`, {
  method: "POST",
  body: { note },
});

export const getSupportCampaignChoices = async () => {
  const [created, backed] = await Promise.allSettled([
    apiRequest("/api/campaigns/my"),
    apiRequest("/api/pledges/my"),
  ]);

  const options = new Map();

  if (created.status === "fulfilled") {
    (created.value.campaigns || []).forEach((campaign) => {
      options.set(campaign.id, {
        id: campaign.id,
        title: campaign.title || "Campagne sans titre",
        origin: "cree",
      });
    });
  }

  if (backed.status === "fulfilled") {
    (backed.value.campaigns || []).forEach((campaign) => {
      if (!options.has(campaign.id)) {
        options.set(campaign.id, {
          id: campaign.id,
          title: campaign.title || "Campagne sans titre",
          origin: "soutenue",
        });
      }
    });
  }

  return Array.from(options.values());
};

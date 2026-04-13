export const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/+$/, "");

export const buildApiUrl = (path) => {
  if (!path) {
    return API_URL;
  }

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
};

export const getAuthHeaders = ({ isFormData = false } = {}) => {
  const token = localStorage.getItem("token");
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
};

export const requestJson = async (path, { method = "GET", body, isFormData = false, headers = {} } = {}) => {
  const response = await fetch(buildApiUrl(path), {
    method,
    headers: {
      ...getAuthHeaders({ isFormData }),
      ...headers,
    },
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

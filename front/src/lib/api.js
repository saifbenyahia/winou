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

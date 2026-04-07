export const formatMillimesToTnd = (amountInMillimes) =>
  `${(Number(amountInMillimes || 0) / 1000).toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  })} DT`;

export const formatTndValue = (amountInTnd) =>
  `${Number(amountInTnd || 0).toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  })} DT`;

export const parseTndInput = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const normalized = String(value).trim().replace(",", ".");
  if (!/^\d+(\.\d{1,3})?$/.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

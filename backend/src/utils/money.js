const buildMoneyError = (message, extras = {}) => {
  const error = new Error(message);
  Object.assign(error, extras);
  return error;
};

export const parseTndToMillimes = (rawValue) => {
  if (rawValue === undefined || rawValue === null) {
    throw buildMoneyError("Le montant est obligatoire.");
  }

  const normalized = String(rawValue)
    .trim()
    .replace(/\s+/g, "")
    .replace(/,/g, ".");

  if (!/^\d+(\.\d{1,3})?$/.test(normalized)) {
    throw buildMoneyError("Le montant doit etre un nombre positif avec jusqu'a 3 decimales.");
  }

  const [wholePart, decimalPart = ""] = normalized.split(".");
  const wholeMillimes = Number.parseInt(wholePart, 10) * 1000;
  const decimalMillimes = Number.parseInt((decimalPart + "000").slice(0, 3), 10);
  const totalMillimes = wholeMillimes + decimalMillimes;

  if (!Number.isSafeInteger(totalMillimes) || totalMillimes <= 0) {
    throw buildMoneyError("Le montant doit etre superieur a zero.");
  }

  return totalMillimes;
};

export const formatMillimesToTnd = (amountMillimes) => {
  const safeAmount = Number.parseInt(amountMillimes, 10);
  if (!Number.isFinite(safeAmount) || safeAmount < 0) {
    return "0.000";
  }

  const wholePart = Math.trunc(safeAmount / 1000);
  const decimalPart = String(Math.abs(safeAmount % 1000)).padStart(3, "0");
  return `${wholePart}.${decimalPart}`;
};

export const millimesToTndNumber = (amountMillimes) => {
  const safeAmount = Number.parseInt(amountMillimes, 10);
  if (!Number.isFinite(safeAmount)) {
    return 0;
  }

  return safeAmount / 1000;
};

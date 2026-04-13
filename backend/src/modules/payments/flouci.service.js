const DEFAULT_BASE_URL = "https://developers.flouci.com/api";
const DEFAULT_TIMEOUT_MS = 15000;

const stripTrailingSlash = (value) => String(value || "").replace(/\/+$/, "");

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized);
};

const buildRequestError = (message, extras = {}) => {
  const error = new Error(message);
  Object.assign(error, extras);
  return error;
};

const readJsonResponse = async (response) => {
  const rawText = await response.text();

  if (!rawText) {
    return {};
  }

  try {
    return JSON.parse(rawText);
  } catch (error) {
    throw buildRequestError("Invalid JSON response received from Flouci.", {
      status: response.status,
      responseText: rawText,
      cause: error,
    });
  }
};

const getFirstDefined = (...values) => values.find((value) => value !== undefined && value !== null && value !== "");

export const parseTndToMillimes = (rawValue) => {
  if (rawValue === undefined || rawValue === null) {
    throw buildRequestError("Le montant est obligatoire.");
  }

  const normalized = String(rawValue)
    .trim()
    .replace(/\s+/g, "")
    .replace(/,/g, ".");

  if (!/^\d+(\.\d{1,3})?$/.test(normalized)) {
    throw buildRequestError("Le montant doit etre un nombre positif avec jusqu'a 3 decimales.");
  }

  const [wholePart, decimalPart = ""] = normalized.split(".");
  const wholeMillimes = Number.parseInt(wholePart, 10) * 1000;
  const decimalMillimes = Number.parseInt((decimalPart + "000").slice(0, 3), 10);
  const total = wholeMillimes + decimalMillimes;

  if (!Number.isSafeInteger(total) || total <= 0) {
    throw buildRequestError("Le montant doit etre superieur a zero.");
  }

  return total;
};

export const formatMillimesToTnd = (amountMillimes) => {
  const safeAmount = Number.parseInt(amountMillimes, 10);
  if (!Number.isFinite(safeAmount) || safeAmount < 0) {
    return "0.000";
  }

  const wholePart = Math.trunc(safeAmount / 1000);
  const decimalPart = String(safeAmount % 1000).padStart(3, "0");
  return `${wholePart}.${decimalPart}`;
};

export const getFlouciConfig = () => {
  const publicKey = process.env.FLOUCI_PUBLIC_KEY;
  const privateKey = process.env.FLOUCI_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    throw buildRequestError("Flouci keys are missing. Configure FLOUCI_PUBLIC_KEY and FLOUCI_PRIVATE_KEY.");
  }

  return {
    publicKey,
    privateKey,
    baseUrl: stripTrailingSlash(process.env.FLOUCI_BASE_URL || DEFAULT_BASE_URL),
    timeoutMs: Number.parseInt(process.env.FLOUCI_TIMEOUT_MS || `${DEFAULT_TIMEOUT_MS}`, 10) || DEFAULT_TIMEOUT_MS,
    frontendUrl: stripTrailingSlash(process.env.FRONTEND_URL || "http://localhost:5173"),
    backendUrl: stripTrailingSlash(process.env.BACKEND_URL || "http://localhost:5000"),
    successUrl: process.env.FLOUCI_SUCCESS_URL || null,
    failUrl: process.env.FLOUCI_FAIL_URL || null,
    webhookUrl: process.env.FLOUCI_WEBHOOK_URL || null,
    acceptCard: parseBoolean(process.env.FLOUCI_ACCEPT_CARD, true),
    sessionTimeoutSecs: Number.parseInt(process.env.FLOUCI_SESSION_TIMEOUT_SECS || "1200", 10) || 1200,
    clientId: process.env.FLOUCI_CLIENT_ID || null,
    testMode: parseBoolean(process.env.FLOUCI_TEST_MODE, true),
  };
};

export const buildFlouciAuthHeader = () => {
  const { publicKey, privateKey } = getFlouciConfig();
  return `Bearer ${publicKey}:${privateKey}`;
};

const flouciRequest = async (path, options = {}) => {
  const config = getFlouciConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(`${config.baseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: buildFlouciAuthHeader(),
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });

    const data = await readJsonResponse(response);

    if (!response.ok) {
      throw buildRequestError("Flouci request failed.", {
        status: response.status,
        details: data,
      });
    }

    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      throw buildRequestError("Flouci request timed out.", { code: "FLOUCI_TIMEOUT" });
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

export const createFlouciPayment = async (payload) => {
  const response = await flouciRequest("/v2/generate_payment", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const result = response.result || response.data || response;
  const paymentId = getFirstDefined(result.payment_id, result.id, response.payment_id);
  const checkoutUrl = getFirstDefined(result.link, result.payment_url, result.paymentLink, response.link);
  const providerStatus = String(getFirstDefined(result.status, response.status, result.success ? "GENERATED" : "ERROR") || "");

  if (!paymentId || !checkoutUrl) {
    throw buildRequestError("Flouci did not return a payment session.", {
      details: response,
    });
  }

  return {
    paymentId: String(paymentId),
    checkoutUrl: String(checkoutUrl),
    providerStatus,
    raw: response,
  };
};

export const verifyFlouciPayment = async (paymentId) => {
  if (!paymentId) {
    throw buildRequestError("A Flouci payment id is required for verification.");
  }

  const response = await flouciRequest(`/v2/verify_payment/${encodeURIComponent(paymentId)}`, {
    method: "GET",
  });

  const result = response.result || response.data || response;

  return {
    paymentId: String(getFirstDefined(result.payment_id, paymentId)),
    providerStatus: String(getFirstDefined(result.status, response.status, "") || "").toUpperCase(),
    amountMillimes: (() => {
      const amount = getFirstDefined(result.amount, result.payment_amount, response.amount);
      if (amount === undefined || amount === null || amount === "") {
        return null;
      }
      const parsed = Number.parseInt(amount, 10);
      return Number.isFinite(parsed) ? parsed : null;
    })(),
    developerTrackingId: getFirstDefined(
      result.developer_tracking_id,
      result.developerTrackingId,
      result.developer_tracking,
      result.tracking_id
    ),
    payerName: getFirstDefined(result.client_name, result.customer_name, result.user_name),
    payerEmail: getFirstDefined(result.client_email, result.customer_email, result.user_email),
    raw: response,
  };
};

export const mapFlouciStatusToDonationStatus = (providerStatus) => {
  const normalized = String(providerStatus || "").trim().toUpperCase();

  if (["SUCCESS", "SUCCEEDED", "PAID"].includes(normalized)) {
    return "PAID";
  }

  if (["PENDING", "PROCESSING", "IN_PROGRESS", "INITIATED"].includes(normalized)) {
    return "PENDING";
  }

  if (["EXPIRED"].includes(normalized)) {
    return "EXPIRED";
  }

  if (["CANCELED", "CANCELLED", "CANCEL"].includes(normalized)) {
    return "CANCELED";
  }

  return "FAILED";
};

export const serializeFlouciError = (error) => ({
  message: error?.message || "Unknown Flouci error.",
  status: error?.status || null,
  code: error?.code || null,
  details: error?.details || null,
  responseText: error?.responseText || null,
});

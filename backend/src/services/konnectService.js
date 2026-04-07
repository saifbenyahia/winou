const DEFAULT_BASE_URL = "https://api.sandbox.konnect.network/api/v2";
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_ACCEPTED_PAYMENT_METHODS = ["wallet", "bank_card", "e-DINAR"];

const stripTrailingSlash = (value) => String(value || "").replace(/\/+$/, "");

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized);
};

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
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
    throw buildRequestError("Invalid JSON response received from Konnect.", {
      status: response.status,
      responseText: rawText,
      cause: error,
    });
  }
};

const getFirstDefined = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== "");

const parseAcceptedPaymentMethods = (rawValue) => {
  if (!rawValue) {
    return DEFAULT_ACCEPTED_PAYMENT_METHODS;
  }

  if (Array.isArray(rawValue)) {
    return rawValue.filter(Boolean);
  }

  return String(rawValue)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
};

const parseAmount = (value) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeTheme = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "dark" ? "dark" : "light";
};

export const getKonnectConfig = () => ({
  apiKey: process.env.KONNECT_API_KEY || "",
  baseUrl: stripTrailingSlash(process.env.KONNECT_BASE_URL || DEFAULT_BASE_URL),
  receiverWalletId: process.env.KONNECT_RECEIVER_WALLET_ID || "",
  timeoutMs: parsePositiveInteger(process.env.KONNECT_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
  lifespanMinutes: parsePositiveInteger(process.env.KONNECT_PAYMENT_LIFESPAN_MINUTES, 30),
  checkoutForm: parseBoolean(process.env.KONNECT_CHECKOUT_FORM, true),
  addPaymentFeesToAmount: parseBoolean(process.env.KONNECT_ADD_PAYMENT_FEES_TO_AMOUNT, false),
  acceptedPaymentMethods: parseAcceptedPaymentMethods(process.env.KONNECT_ACCEPTED_PAYMENT_METHODS),
  theme: normalizeTheme(process.env.KONNECT_THEME || "light"),
});

const assertKonnectCredentials = (config, { requireWalletId = false } = {}) => {
  const missing = [];

  if (!config.apiKey) {
    missing.push("KONNECT_API_KEY");
  }

  if (requireWalletId && !config.receiverWalletId) {
    missing.push("KONNECT_RECEIVER_WALLET_ID");
  }

  if (missing.length > 0) {
    throw buildRequestError(`Configuration Konnect incomplete: ${missing.join(", ")}`);
  }
};

const konnectRequest = async (path, { method = "GET", body = null, requireWalletId = false } = {}) => {
  const config = getKonnectConfig();
  assertKonnectCredentials(config, { requireWalletId });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(`${config.baseUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const data = await readJsonResponse(response);

    if (!response.ok) {
      throw buildRequestError("Konnect request failed.", {
        status: response.status,
        details: data,
      });
    }

    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      throw buildRequestError("Konnect request timed out.", {
        code: "KONNECT_TIMEOUT",
      });
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

export const initiateKonnectPayment = async (payload) => {
  const response = await konnectRequest("/payments/init-payment", {
    method: "POST",
    body: payload,
    requireWalletId: true,
  });

  const payUrl = getFirstDefined(response.payUrl, response.paymentUrl, response.link);
  const paymentRef = getFirstDefined(response.paymentRef, response.payment_ref, response.id);

  if (!payUrl || !paymentRef) {
    throw buildRequestError("Konnect did not return a usable hosted checkout session.", {
      details: response,
    });
  }

  return {
    payUrl: String(payUrl),
    paymentRef: String(paymentRef),
    raw: response,
  };
};

export const getKonnectPaymentDetails = async (paymentRef) => {
  if (!paymentRef) {
    throw buildRequestError("Une reference de paiement Konnect est obligatoire.");
  }

  const response = await konnectRequest(`/payments/${encodeURIComponent(paymentRef)}`, {
    method: "GET",
  });

  const payment = response.payment || response.data?.payment || response.data || response;
  const resolvedPaymentRef = getFirstDefined(payment.id, response.paymentRef, response.payment_ref, paymentRef);

  return {
    paymentRef: String(resolvedPaymentRef),
    status: String(getFirstDefined(payment.status, response.status, "") || "").trim().toLowerCase(),
    token: getFirstDefined(payment.token, response.token, null),
    amount: parseAmount(payment.amount),
    amountDue: parseAmount(payment.amountDue),
    reachedAmount: parseAmount(payment.reachedAmount),
    shortId: getFirstDefined(payment.shortId, payment.short_id, null),
    orderId: getFirstDefined(payment.orderId, payment.order_id, null),
    description: getFirstDefined(payment.details, payment.description, null),
    expirationDate: getFirstDefined(payment.expirationDate, payment.expiration_date, null),
    transactions: Array.isArray(payment.transactions) ? payment.transactions : [],
    raw: response,
  };
};

export const serializeKonnectError = (error) => ({
  message: error?.message || "Unknown Konnect error.",
  status: error?.status || null,
  code: error?.code || null,
  details: error?.details || null,
  responseText: error?.responseText || null,
});

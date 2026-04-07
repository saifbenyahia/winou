import pool from "../config/db.js";
import * as CampaignModel from "../models/campaignModel.js";
import * as DonationModel from "../models/donationModel.js";
import * as PaymentWebhookEventModel from "../models/paymentWebhookEventModel.js";
import * as UserModel from "../models/userModel.js";
import { sendNewSupportNotification } from "./notificationService.js";
import {
  getKonnectConfig,
  getKonnectPaymentDetails,
  initiateKonnectPayment,
  serializeKonnectError,
} from "./konnectService.js";
import {
  formatMillimesToTnd,
  parseTndToMillimes,
} from "../utils/money.js";

const stripTrailingSlash = (value) => String(value || "").replace(/\/+$/, "");

const buildRequestError = (message, extras = {}) => {
  const error = new Error(message);
  Object.assign(error, extras);
  return error;
};

const buildPublicUrl = (baseUrl, fallbackPath) => `${stripTrailingSlash(baseUrl)}${fallbackPath}`;

const buildReturnUrl = (baseUrl, searchParams) => {
  const url = new URL(baseUrl);

  Object.entries(searchParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
};

const serializeInitPayload = (requestPayload, responsePayload = null, errorPayload = null) => ({
  request: requestPayload,
  response: responsePayload,
  error: errorPayload,
});

const serializeDetailsPayload = (paymentDetails, validationSummary) => ({
  normalized: {
    paymentRef: paymentDetails.paymentRef,
    status: paymentDetails.status,
    token: paymentDetails.token,
    amount: paymentDetails.amount,
    amountDue: paymentDetails.amountDue,
    reachedAmount: paymentDetails.reachedAmount,
    shortId: paymentDetails.shortId,
    orderId: paymentDetails.orderId,
    expirationDate: paymentDetails.expirationDate,
  },
  validation: validationSummary,
  response: paymentDetails.raw,
});

const splitFullName = (rawName) => {
  const parts = String(rawName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return { firstName: null, lastName: null };
  }

  const [firstName, ...rest] = parts;
  return {
    firstName,
    lastName: rest.join(" ") || null,
  };
};

const buildDonationDescription = (campaignTitle) => {
  const baseDescription = `Soutien Hive.tn - ${campaignTitle || "Campagne"}`;
  return baseDescription.length <= 180 ? baseDescription : `${baseDescription.slice(0, 177)}...`;
};

const normalizeStatus = (value) => String(value || "").trim().toUpperCase();

const hasAnyTransactionStatus = (paymentDetails, acceptedStatuses) =>
  paymentDetails.transactions.some((transaction) =>
    acceptedStatuses.includes(normalizeStatus(transaction?.status))
  );

const isExpiredPayment = (paymentDetails) => {
  if (!paymentDetails.expirationDate) {
    return false;
  }

  const timestamp = new Date(paymentDetails.expirationDate).getTime();
  return Number.isFinite(timestamp) && timestamp < Date.now();
};

const resolveExpectedAmount = (paymentDetails) =>
  paymentDetails.amountDue ?? paymentDetails.amount ?? paymentDetails.reachedAmount ?? null;

const resolveSettledAmount = (paymentDetails) =>
  paymentDetails.reachedAmount ?? paymentDetails.amount ?? 0;

const deriveDonationStatusFromKonnect = (donation, paymentDetails) => {
  // Konnect documents payment.status as the authoritative paid signal.
  // We only mark PAID from `completed`, then refine non-paid states with
  // expiration and transaction hints when they are present.
  const paymentStatus = normalizeStatus(paymentDetails.status);
  const expectedAmount = resolveExpectedAmount(paymentDetails);
  const settledAmount = resolveSettledAmount(paymentDetails);
  const currencyMatches =
    !paymentDetails.token || paymentDetails.token === donation.currency_token;
  const amountMatches =
    expectedAmount === null || expectedAmount === donation.amount_millimes;
  const isSettledEnough = settledAmount >= donation.amount_millimes;

  if (paymentStatus === "COMPLETED") {
    if (currencyMatches && amountMatches && isSettledEnough) {
      return "PAID";
    }

    return "FAILED";
  }

  if (paymentStatus.includes("CANCEL")) {
    return "CANCELED";
  }

  if (paymentStatus.includes("EXPIRE")) {
    return "EXPIRED";
  }

  if (paymentStatus.includes("FAIL")) {
    return "FAILED";
  }

  if (hasAnyTransactionStatus(paymentDetails, ["CANCELED", "CANCELLED"])) {
    return "CANCELED";
  }

  if (hasAnyTransactionStatus(paymentDetails, ["FAILED", "DECLINED", "REFUSED", "ERROR"])) {
    return "FAILED";
  }

  if (isExpiredPayment(paymentDetails)) {
    return "EXPIRED";
  }

  return "PENDING";
};

const buildValidationSummary = (donation, paymentDetails) => ({
  expectedAmountMillimes: donation.amount_millimes,
  reportedAmountMillimes: resolveExpectedAmount(paymentDetails),
  settledAmountMillimes: resolveSettledAmount(paymentDetails),
  currencyMatches:
    !paymentDetails.token || paymentDetails.token === donation.currency_token,
  orderMatches:
    !paymentDetails.orderId ||
    !donation.provider_order_id ||
    paymentDetails.orderId === donation.provider_order_id,
});

const buildDonationPublicData = (donation) => ({
  id: donation.id,
  campaign_id: donation.campaign_id,
  user_id: donation.user_id,
  provider: donation.provider,
  amount_millimes: donation.amount_millimes,
  amount_tnd: formatMillimesToTnd(donation.amount_millimes),
  currency_token: donation.currency_token,
  status: donation.status,
  payment_ref: donation.provider_payment_ref,
  short_id: donation.provider_short_id,
  order_id: donation.provider_order_id,
  provider_status: donation.provider_status,
  description: donation.description,
  created_at: donation.created_at,
  updated_at: donation.updated_at,
  paid_at: donation.paid_at,
});

const buildCampaignPublicData = (campaign) => ({
  id: campaign.id,
  title: campaign.title,
  status: campaign.status,
  category: campaign.category,
  target_amount: campaign.target_amount,
  current_amount: campaign.current_amount,
  amount_raised: campaign.amount_raised,
  funded_percent: campaign.funded_percent,
  backer_count: campaign.backer_count,
  paid_donation_count: campaign.paid_donation_count,
  image_url: campaign.image_url,
});

const resolveHostedFlowUrls = (donation) => {
  const successBaseUrl =
    process.env.KONNECT_SUCCESS_URL ||
    buildPublicUrl(process.env.FRONTEND_URL || "http://localhost:5173", "/payment/success");
  const failBaseUrl =
    process.env.KONNECT_FAIL_URL ||
    buildPublicUrl(process.env.FRONTEND_URL || "http://localhost:5173", "/payment/fail");
  const webhookUrl =
    process.env.KONNECT_WEBHOOK_URL ||
    buildPublicUrl(process.env.BACKEND_URL || "http://localhost:5000", "/api/payments/konnect/webhook");

  return {
    successUrl: buildReturnUrl(successBaseUrl, {
      donation_id: donation.id,
      order_id: donation.provider_order_id || donation.id,
      campaign_id: donation.campaign_id,
    }),
    failUrl: buildReturnUrl(failBaseUrl, {
      donation_id: donation.id,
      order_id: donation.provider_order_id || donation.id,
      campaign_id: donation.campaign_id,
    }),
    webhookUrl,
  };
};

const buildInitPayload = ({ donation, campaign, donor }) => {
  const config = getKonnectConfig();
  const { firstName, lastName } = splitFullName(donor.name);
  const { successUrl, failUrl, webhookUrl } = resolveHostedFlowUrls(donation);

  const payload = {
    receiverWalletId: config.receiverWalletId,
    token: donation.currency_token,
    amount: donation.amount_millimes,
    type: "immediate",
    description: donation.description,
    acceptedPaymentMethods: config.acceptedPaymentMethods,
    lifespan: config.lifespanMinutes,
    checkoutForm: config.checkoutForm,
    addPaymentFeesToAmount: config.addPaymentFeesToAmount,
    orderId: donation.provider_order_id,
    webhook: webhookUrl,
    successUrl,
    failUrl,
    theme: config.theme,
  };

  if (firstName) {
    payload.firstName = firstName;
  }

  if (lastName) {
    payload.lastName = lastName;
  }

  if (donor.email) {
    payload.email = donor.email;
  }

  return {
    payload,
    urls: { successUrl, failUrl, webhookUrl },
    config,
    campaignTitle: campaign.title,
  };
};

const resolveDonationForFinalization = async ({ paymentRef, donationId, providerOrderId }) => {
  if (paymentRef) {
    const donation = await DonationModel.findByProviderPaymentRef(paymentRef);
    if (donation) {
      return donation;
    }
  }

  if (donationId) {
    const donation = await DonationModel.findById(donationId);
    if (donation) {
      return donation;
    }
  }

  if (providerOrderId) {
    return DonationModel.findByProviderOrderId(providerOrderId);
  }

  return null;
};

const assertPaymentMatchesDonation = (donation, paymentDetails) => {
  if (
    paymentDetails.orderId &&
    donation.provider_order_id &&
    paymentDetails.orderId !== donation.provider_order_id
  ) {
    throw buildRequestError("La commande Konnect ne correspond pas a la donation interne.", {
      status: 409,
    });
  }

  if (
    paymentDetails.paymentRef &&
    donation.provider_payment_ref &&
    paymentDetails.paymentRef !== donation.provider_payment_ref
  ) {
    throw buildRequestError("La reference Konnect ne correspond pas a la donation interne.", {
      status: 409,
    });
  }
};

export const createKonnectPaymentSession = async ({ campaignId, userId, amountTnd }) => {
  const campaign = await CampaignModel.findById(campaignId);
  if (!campaign) {
    throw buildRequestError("Campagne introuvable.", { status: 404 });
  }

  if (campaign.status !== "ACTIVE") {
    throw buildRequestError("Seules les campagnes actives peuvent recevoir des contributions.", {
      status: 400,
    });
  }

  const donor = await UserModel.findById(userId);
  if (!donor) {
    throw buildRequestError("Utilisateur introuvable.", { status: 404 });
  }

  const amountMillimes = parseTndToMillimes(amountTnd);
  const baseDonation = await DonationModel.createPendingDonation(null, {
    campaignId: campaign.id,
    userId: donor.id,
    amountMillimes,
    currencyToken: "TND",
    provider: "konnect",
  });

  const description = buildDonationDescription(campaign.title);
  const preparedDonation = await DonationModel.updateDonation(null, baseDonation.id, {
    provider_order_id: baseDonation.id,
    description,
  });

  const { payload } = buildInitPayload({
    donation: preparedDonation,
    campaign,
    donor,
  });

  try {
    const konnectSession = await initiateKonnectPayment(payload);

    const updatedDonation = await DonationModel.updateDonation(null, preparedDonation.id, {
      provider_payment_ref: konnectSession.paymentRef,
      provider_status: "pending",
      provider_payload_init: serializeInitPayload(payload, konnectSession.raw),
    });

    console.info(
      `[Konnect] Initiated donation ${updatedDonation.id} for campaign ${campaign.id} with paymentRef ${konnectSession.paymentRef}`
    );

    return {
      donation: updatedDonation,
      campaign,
      payUrl: konnectSession.payUrl,
      paymentRef: konnectSession.paymentRef,
    };
  } catch (error) {
    await DonationModel.updateDonation(null, preparedDonation.id, {
      status: "FAILED",
      provider_status: "INIT_ERROR",
      provider_payload_init: serializeInitPayload(payload, null, serializeKonnectError(error)),
    });

    throw error;
  }
};

export const finalizeKonnectPayment = async ({
  paymentRef = null,
  donationId = null,
  providerOrderId = null,
}) => {
  let donation = await resolveDonationForFinalization({ paymentRef, donationId, providerOrderId });
  const paymentRefToVerify = paymentRef || donation?.provider_payment_ref;

  if (!paymentRefToVerify) {
    throw buildRequestError("Impossible de verifier ce paiement sans reference Konnect.", {
      status: 400,
    });
  }

  const paymentDetails = await getKonnectPaymentDetails(paymentRefToVerify);

  if (!donation && paymentDetails.orderId) {
    donation = await DonationModel.findByProviderOrderId(paymentDetails.orderId);
  }

  if (!donation) {
    throw buildRequestError("Aucune donation interne ne correspond a ce paiement.", {
      status: 404,
    });
  }

  assertPaymentMatchesDonation(donation, paymentDetails);

  const validationSummary = buildValidationSummary(donation, paymentDetails);
  const nextStatus = deriveDonationStatusFromKonnect(donation, paymentDetails);
  const client = await pool.connect();
  let transitionedToPaid = false;

  try {
    await client.query("BEGIN");

    const lockedDonation = await DonationModel.lockById(client, donation.id);
    if (!lockedDonation) {
      throw buildRequestError("Donation introuvable.", { status: 404 });
    }

    const effectiveStatus = lockedDonation.status === "PAID" ? "PAID" : nextStatus;
    const paidAt =
      effectiveStatus === "PAID"
        ? lockedDonation.paid_at || new Date().toISOString()
        : lockedDonation.paid_at;

    const updatedDonation = await DonationModel.updateDonation(client, lockedDonation.id, {
      status: effectiveStatus,
      provider_payment_ref: paymentDetails.paymentRef,
      provider_short_id: paymentDetails.shortId,
      provider_order_id: paymentDetails.orderId || lockedDonation.provider_order_id,
      provider_status: paymentDetails.status || lockedDonation.provider_status,
      provider_payload_details: serializeDetailsPayload(paymentDetails, validationSummary),
      paid_at: paidAt,
    });

    if (effectiveStatus === "PAID" && lockedDonation.status !== "PAID") {
      transitionedToPaid = true;
      await client.query(
        `UPDATE campaigns
         SET current_amount = current_amount + $1
         WHERE id = $2`,
        [lockedDonation.amount_millimes, lockedDonation.campaign_id]
      );
    }

    await client.query("COMMIT");

    const refreshedCampaign = await CampaignModel.findById(donation.campaign_id);

    if (transitionedToPaid) {
      const donor = await UserModel.findById(donation.user_id);
      if (refreshedCampaign && donor) {
        await sendNewSupportNotification({
          campaign: refreshedCampaign,
          donor,
          amount: donation.amount_millimes,
        });
      }
    }

    console.info(
      `[Konnect] Finalized donation ${updatedDonation.id} with internal status ${updatedDonation.status} and paymentRef ${paymentDetails.paymentRef}`
    );

    return {
      donation: updatedDonation,
      campaign: refreshedCampaign,
      paymentDetails,
      alreadyFinalized: !transitionedToPaid && updatedDonation?.status === "PAID",
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const processKonnectWebhook = async ({ queryParams = {}, payload = null }) => {
  const paymentRef = queryParams.payment_ref || queryParams.paymentRef || null;

  const webhookEvent = await PaymentWebhookEventModel.createWebhookEvent({
    provider: "konnect",
    queryParams,
    payload,
  });

  try {
    if (!paymentRef) {
      throw buildRequestError("Webhook Konnect recu sans payment_ref.", {
        status: 400,
      });
    }

    console.info(`[Konnect] Webhook received for paymentRef ${paymentRef}`);

    const result = await finalizeKonnectPayment({ paymentRef });
    await PaymentWebhookEventModel.markWebhookProcessed(webhookEvent.id);

    return {
      webhookEvent,
      result,
    };
  } catch (error) {
    await PaymentWebhookEventModel.markWebhookFailed(webhookEvent.id, error.message);
    throw error;
  }
};

export const buildCreatePaymentResponse = ({ donation, campaign, payUrl, paymentRef }) => ({
  success: true,
  pay_url: payUrl,
  payment_ref: paymentRef,
  status_check_url: `/api/payments/konnect/status/${paymentRef}`,
  donation: buildDonationPublicData(donation),
  campaign: buildCampaignPublicData(campaign),
});

export const buildPaymentStatusResponse = ({
  donation,
  campaign,
  paymentDetails,
  alreadyFinalized = false,
}) => ({
  success: true,
  verified: donation.status === "PAID",
  already_verified: alreadyFinalized,
  status: donation.status,
  provider_status: paymentDetails?.status || donation.provider_status,
  payment_ref: paymentDetails?.paymentRef || donation.provider_payment_ref,
  donation: buildDonationPublicData(donation),
  campaign: campaign ? buildCampaignPublicData(campaign) : null,
});

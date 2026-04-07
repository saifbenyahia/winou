import {
  buildCreatePaymentResponse,
  buildPaymentStatusResponse,
  createKonnectPaymentSession,
  finalizeKonnectPayment,
  processKonnectWebhook,
} from "../services/paymentService.js";

const getQueryValue = (value) => (Array.isArray(value) ? value[0] : value);

export const initiateKonnectPayment = async (req, res) => {
  try {
    const { campaign_id: campaignId, amount_tnd: amountTnd } = req.body || {};

    if (!campaignId || amountTnd === undefined || amountTnd === null || amountTnd === "") {
      return res.status(400).json({
        success: false,
        message: "La campagne et le montant en TND sont obligatoires.",
      });
    }

    const result = await createKonnectPaymentSession({
      campaignId,
      userId: req.user.id,
      amountTnd,
    });

    return res.status(201).json(buildCreatePaymentResponse(result));
  } catch (error) {
    console.error("Initiate Konnect payment error:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Impossible d'initialiser le paiement Konnect.",
    });
  }
};

export const getKonnectPaymentStatus = async (req, res) => {
  try {
    const paymentRef =
      req.params.paymentRef ||
      getQueryValue(req.query.payment_ref) ||
      getQueryValue(req.query.paymentRef) ||
      null;
    const donationId = getQueryValue(req.query.donation_id) || getQueryValue(req.query.donationId) || null;
    const providerOrderId = getQueryValue(req.query.order_id) || getQueryValue(req.query.orderId) || null;

    const result = await finalizeKonnectPayment({
      paymentRef,
      donationId,
      providerOrderId,
    });

    return res.status(200).json(buildPaymentStatusResponse(result));
  } catch (error) {
    console.error("Get Konnect payment status error:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Impossible de verifier ce paiement Konnect.",
    });
  }
};

export const receiveKonnectWebhook = async (req, res) => {
  try {
    const result = await processKonnectWebhook({
      queryParams: Object.fromEntries(
        Object.entries(req.query || {}).map(([key, value]) => [key, getQueryValue(value)])
      ),
      payload: req.body || null,
    });

    return res.status(200).json({
      success: true,
      webhook_event_id: result.webhookEvent.id,
      status: result.result.donation.status,
    });
  } catch (error) {
    console.error("Konnect webhook processing error:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Impossible de traiter ce webhook Konnect.",
    });
  }
};

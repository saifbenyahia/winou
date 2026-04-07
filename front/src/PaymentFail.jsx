import React, { useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import Navbar from "./Navbar";
import "./PaymentStatus.css";
import { readPendingKonnectPayment } from "./utils/paymentSession";

const getFirstSearchValue = (searchParams, keys) => {
  for (const key of keys) {
    const value = searchParams.get(key);
    if (value) {
      return value;
    }
  }

  return null;
};

const buildSuccessPageHref = ({ paymentRef, donationId, orderId, campaignId }) => {
  const query = new URLSearchParams();
  if (paymentRef) query.set("payment_ref", paymentRef);
  if (donationId) query.set("donation_id", donationId);
  if (orderId) query.set("order_id", orderId);
  if (campaignId) query.set("campaign_id", campaignId);
  return `/payment/success${query.toString() ? `?${query.toString()}` : ""}`;
};

const PaymentFail = ({ isAuthenticated, onNavigate, onLogout }) => {
  const [searchParams] = useSearchParams();
  const storedPayment = useMemo(() => readPendingKonnectPayment(), []);

  const campaignId =
    getFirstSearchValue(searchParams, ["campaign_id", "campaignId"]) || storedPayment?.campaignId || null;
  const paymentRef =
    getFirstSearchValue(searchParams, ["payment_ref", "paymentRef"]) || storedPayment?.paymentRef || null;
  const donationId =
    getFirstSearchValue(searchParams, ["donation_id", "donationId"]) || storedPayment?.donationId || null;
  const orderId =
    getFirstSearchValue(searchParams, ["order_id", "orderId"]) || storedPayment?.orderId || null;
  const canVerifyStatus = Boolean(paymentRef || donationId || orderId);

  return (
    <div className="payment-status-page">
      <Navbar onNavigate={onNavigate} isAuthenticated={isAuthenticated} onLogout={onLogout} activeTab="projectDetails" />

      <main className="payment-status-shell">
        <section className="payment-status-card">
          <span className="payment-status-badge is-failure">Paiement interrompu</span>
          <h1>La contribution n a pas ete finalisee</h1>
          <p className="payment-status-copy">
            Aucun montant n est comptabilise tant que Hive.tn n a pas verifie un paiement Konnect reussi. Vous pouvez relancer la contribution ou verifier son statut une nouvelle fois.
          </p>

          <div className="payment-status-alert">
            <strong>Ca peut arriver si :</strong>
            <p>vous avez annule le paiement, la session a expire ou Konnect a renvoye un echec/cancelation.</p>
          </div>

          <div className="payment-status-actions">
            {campaignId && (
              <button
                type="button"
                className="payment-status-btn is-primary"
                onClick={() => onNavigate("donationPage", campaignId)}
              >
                Reessayer le paiement
              </button>
            )}

            {canVerifyStatus && (
              <button
                type="button"
                className="payment-status-btn is-secondary"
                onClick={() =>
                  window.location.assign(
                    buildSuccessPageHref({
                      paymentRef,
                      donationId,
                      orderId,
                      campaignId,
                    })
                  )
                }
              >
                Verifier le statut
              </button>
            )}

            <button
              type="button"
              className="payment-status-btn is-secondary"
              onClick={() => {
                if (campaignId) {
                  onNavigate("projectDetails", campaignId);
                  return;
                }
                onNavigate("discover");
              }}
            >
              Retourner a la campagne
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default PaymentFail;

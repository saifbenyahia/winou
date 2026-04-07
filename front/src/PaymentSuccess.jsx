import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import Navbar from "./Navbar";
import "./PaymentStatus.css";
import { buildApiUrl } from "./lib/api";
import { formatMillimesToTnd } from "./utils/currency";
import {
  clearPendingKonnectPayment,
  readPendingKonnectPayment,
} from "./utils/paymentSession";

const getFirstSearchValue = (searchParams, keys) => {
  for (const key of keys) {
    const value = searchParams.get(key);
    if (value) {
      return value;
    }
  }

  return null;
};

const buildVerificationTarget = (searchParams, storedPayment) => {
  const paymentRef =
    getFirstSearchValue(searchParams, ["payment_ref", "paymentRef"]) || storedPayment?.paymentRef || null;
  const donationId =
    getFirstSearchValue(searchParams, ["donation_id", "donationId"]) || storedPayment?.donationId || null;
  const orderId =
    getFirstSearchValue(searchParams, ["order_id", "orderId"]) || storedPayment?.orderId || null;
  const campaignId =
    getFirstSearchValue(searchParams, ["campaign_id", "campaignId"]) || storedPayment?.campaignId || null;

  if (paymentRef) {
    return {
      paymentRef,
      donationId,
      orderId,
      campaignId,
      url: buildApiUrl(`/api/payments/konnect/status/${encodeURIComponent(paymentRef)}`),
    };
  }

  const query = new URLSearchParams();
  if (donationId) query.set("donation_id", donationId);
  if (orderId) query.set("order_id", orderId);

  if (!query.toString()) {
    return {
      paymentRef: null,
      donationId: null,
      orderId: null,
      campaignId,
      url: null,
    };
  }

  return {
    paymentRef: null,
    donationId,
    orderId,
    campaignId,
    url: buildApiUrl(`/api/payments/konnect/status?${query.toString()}`),
  };
};

const resolveAmountLabel = (donation) => {
  if (!donation) return "Montant indisponible";
  if (donation.amount_millimes !== undefined) {
    return formatMillimesToTnd(donation.amount_millimes);
  }
  return donation.amount_tnd ? `${donation.amount_tnd} DT` : "Montant indisponible";
};

const PaymentSuccess = ({ isAuthenticated, onNavigate, onLogout }) => {
  const [searchParams] = useSearchParams();
  const storedPayment = useMemo(() => readPendingKonnectPayment(), []);
  const verificationTarget = useMemo(
    () => buildVerificationTarget(searchParams, storedPayment),
    [searchParams, storedPayment]
  );
  const [state, setState] = useState({
    loading: true,
    error: "",
    data: null,
  });

  const verifyPayment = async () => {
    if (!verificationTarget.url) {
      setState({
        loading: false,
        error: "Aucun identifiant de paiement Konnect n a ete retrouve pour lancer la verification.",
        data: null,
      });
      return;
    }

    setState((previous) => ({ ...previous, loading: true, error: "" }));

    try {
      const response = await fetch(verificationTarget.url);
      const data = await response.json();

      if (!response.ok || !data.success) {
        setState({
          loading: false,
          error: data.message || "Impossible de verifier le paiement pour le moment.",
          data: null,
        });
        return;
      }

      if (["PAID", "FAILED", "EXPIRED", "CANCELED"].includes(data.status)) {
        clearPendingKonnectPayment(data.payment_ref || verificationTarget.paymentRef || null);
      }

      setState({
        loading: false,
        error: "",
        data,
      });
    } catch (error) {
      console.error("Verify Konnect payment error:", error);
      setState({
        loading: false,
        error: "Une erreur reseau a empeche la verification du paiement.",
        data: null,
      });
    }
  };

  useEffect(() => {
    verifyPayment();
  }, [verificationTarget.url]);

  const donation = state.data?.donation || null;
  const campaign = state.data?.campaign || null;
  const status = state.data?.status || null;
  const campaignId = campaign?.id || verificationTarget.campaignId;
  const reference = donation?.payment_ref || donation?.order_id || verificationTarget.paymentRef || donation?.id;

  let title = "Verification du paiement";
  let copy = "Nous confirmons votre contribution directement aupres de Konnect avant de la compter dans la collecte.";
  let badgeClass = "is-neutral";

  if (status === "PAID") {
    title = "Paiement confirme";
    copy = "Votre donation a ete payee avec succes et la campagne a ete mise a jour apres verification serveur.";
    badgeClass = "is-success";
  } else if (status === "PENDING") {
    title = "Verification en cours";
    copy = "Le webhook ou la verification manuelle n a pas encore retourne de statut final. Vous pouvez relancer la verification dans quelques instants.";
    badgeClass = "is-pending";
  } else if (status) {
    title = "Paiement non confirme";
    copy = "Le paiement n a pas pu etre marque comme paye apres verification serveur.";
    badgeClass = "is-failure";
  }

  return (
    <div className="payment-status-page">
      <Navbar onNavigate={onNavigate} isAuthenticated={isAuthenticated} onLogout={onLogout} activeTab="projectDetails" />

      <main className="payment-status-shell">
        <section className="payment-status-card">
          <span className={`payment-status-badge ${badgeClass}`}>
            {state.loading ? "Verification..." : title}
          </span>

          <h1>{state.loading ? "Confirmation du paiement Konnect" : title}</h1>
          <p className="payment-status-copy">
            {state.loading ? "Nous verifions le paiement avant d afficher le resultat final." : copy}
          </p>

          {state.error && (
            <div className="payment-status-alert is-error">
              <strong>Verification impossible</strong>
              <p>{state.error}</p>
            </div>
          )}

          {!state.loading && donation && campaign && (
            <div className="payment-status-grid">
              <div className="payment-status-grid__item">
                <span>Campagne</span>
                <strong>{campaign.title}</strong>
              </div>
              <div className="payment-status-grid__item">
                <span>Montant</span>
                <strong>{resolveAmountLabel(donation)}</strong>
              </div>
              <div className="payment-status-grid__item">
                <span>Statut</span>
                <strong>{status}</strong>
              </div>
              <div className="payment-status-grid__item">
                <span>Reference</span>
                <strong>{reference || "Indisponible"}</strong>
              </div>
            </div>
          )}

          {!state.loading && status === "PAID" && campaign && (
            <div className="payment-status-summary">
              <div>
                <span>Collecte actuelle</span>
                <strong>{formatMillimesToTnd(campaign.amount_raised ?? campaign.current_amount ?? 0)}</strong>
              </div>
              <div>
                <span>Progression</span>
                <strong>{campaign.funded_percent || 0}%</strong>
              </div>
            </div>
          )}

          <div className="payment-status-actions">
            {(status === "PENDING" || state.error) && (
              <button type="button" className="payment-status-btn is-primary" onClick={verifyPayment}>
                Relancer la verification
              </button>
            )}

            <button
              type="button"
              className="payment-status-btn is-primary"
              onClick={() => {
                if (campaignId) {
                  onNavigate("projectDetails", campaignId);
                  return;
                }
                onNavigate("discover");
              }}
            >
              Retour a la campagne
            </button>

            <button
              type="button"
              className="payment-status-btn is-secondary"
              onClick={() => onNavigate("discover")}
            >
              Decouvrir d autres projets
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default PaymentSuccess;

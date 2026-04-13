import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import "./SupportTicketDetailsPage.css";
import SupportCenterLayout from "./components/Support/SupportCenterLayout";
import {
  SupportCategoryBadge,
  SupportPriorityBadge,
  SupportStatusBadge,
} from "./components/Support/SupportBadges";
import SupportMessageBubble from "./components/Support/SupportMessageBubble";
import {
  closeSupportTicket,
  getUserSupportTicket,
  replyToSupportTicket,
} from "./modules/support/services/supportApi.js";
import {
  formatSupportDate,
  getCategoryLabel,
} from "./modules/support/utils/supportUtils.js";

const SupportTicketDetailsPage = ({ onNavigate, isAuthenticated, onLogout }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem("token");
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const endOfMessagesRef = useRef(null);
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState(location.state?.feedback || "");
  const [replyMessage, setReplyMessage] = useState("");
  const [replyAttachment, setReplyAttachment] = useState(null);
  const [replyError, setReplyError] = useState("");
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);

  const loadTicket = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getUserSupportTicket(id);
      setTicket(data.ticket);
    } catch (loadError) {
      setError(loadError.message || "Impossible de charger cette conversation.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
    }
  }, [navigate, token]);

  useEffect(() => {
    if (!token) return;
    loadTicket();
  }, [id, token]);

  useEffect(() => {
    if (location.state?.feedback) {
      setFlash(location.state.feedback);
      navigate(location.pathname, { replace: true });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [ticket?.messages?.length]);

  const replyBlocked = useMemo(() => (
    ticket && ["RESOLVED", "CLOSED"].includes(ticket.status)
  ), [ticket]);

  if (!token) return null;

  const handleReply = async (event) => {
    event.preventDefault();
    setReplyError("");
    setFlash("");

    if (!replyMessage.trim()) {
      setReplyError("Votre message ne peut pas etre vide.");
      return;
    }

    if (replyAttachment && replyAttachment.size > 10 * 1024 * 1024) {
      setReplyError("La piece jointe ne doit pas depasser 10 MB.");
      return;
    }

    setSending(true);

    try {
      const data = await replyToSupportTicket(id, {
        message: replyMessage.trim(),
        attachment: replyAttachment,
      });

      setTicket(data.ticket);
      setReplyMessage("");
      setReplyAttachment(null);
      setFlash(data.message || "Votre reponse a ete envoyee.");
    } catch (replyFailure) {
      setReplyError(replyFailure.message || "Impossible d envoyer votre reponse.");
    } finally {
      setSending(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!ticket) return;

    setClosing(true);
    setFlash("");
    setReplyError("");

    try {
      const data = await closeSupportTicket(ticket.id);
      setTicket(data.ticket);
      setFlash(data.message || "Le ticket a ete ferme.");
    } catch (closeFailure) {
      setReplyError(closeFailure.message || "Impossible de fermer le ticket.");
    } finally {
      setClosing(false);
    }
  };

  return (
    <SupportCenterLayout
      onNavigate={onNavigate}
      isAuthenticated={isAuthenticated}
      onLogout={onLogout}
      title={ticket ? ticket.title : "Conversation support"}
      subtitle={ticket ? `Reference ${ticket.code}` : "Chargement de la conversation..."}
      actions={(
        <>
          <button type="button" className="nav-btn-outline" onClick={loadTicket}>
            Rafraichir
          </button>
          <button type="button" className="nav-btn-outline" onClick={() => navigate("/support")}>
            Retour a la liste
          </button>
          {ticket && ticket.status !== "CLOSED" && (
            <button type="button" className="nav-btn-solid" onClick={handleCloseTicket} disabled={closing}>
              {closing ? "Fermeture..." : "Fermer le ticket"}
            </button>
          )}
        </>
      )}
    >
      {flash && (
        <div className="support-feedback-banner is-success">
          <p>{flash}</p>
        </div>
      )}

      {replyError && (
        <div className="support-feedback-banner is-error">
          <p>{replyError}</p>
        </div>
      )}

      {loading ? (
        <section className="support-loading-grid">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="support-skeleton-card" />
          ))}
        </section>
      ) : error ? (
        <section className="support-empty-state">
          <div className="support-empty-state__badge">Erreur</div>
          <h2>Impossible d afficher ce ticket</h2>
          <p>{error}</p>
          <button className="nav-btn-solid" onClick={loadTicket}>
            Recharger
          </button>
        </section>
      ) : ticket ? (
        <div className="support-details-grid">
          <div className="support-conversation-card">
            <div className="support-conversation-card__header">
              <div>
                <h2>Conversation</h2>
                <p>Les echanges restent centralises dans ce fil.</p>
              </div>
              <SupportStatusBadge status={ticket.status} />
            </div>

            <div className="support-message-thread">
              {ticket.messages?.map((message) => (
                <SupportMessageBubble
                  key={message.id}
                  message={message}
                  isOwnMessage={message.sender_role === "USER" && message.sender_id === currentUser.id}
                />
              ))}
              <div ref={endOfMessagesRef} />
            </div>

            {replyBlocked ? (
              <div className="support-thread-closed-callout">
                <strong>Ce ticket est clos.</strong>
                <span>La conversation reste consultable, mais vous ne pouvez plus y repondre depuis cet espace.</span>
              </div>
            ) : (
              <form className="support-reply-form" onSubmit={handleReply}>
                <label>
                  <span>Votre reponse</span>
                  <textarea
                    rows="5"
                    placeholder="Ajoutez un message clair pour continuer la conversation."
                    value={replyMessage}
                    onChange={(event) => setReplyMessage(event.target.value)}
                  />
                </label>
                <div className="support-reply-form__footer">
                  <label className="support-reply-form__upload">
                    <span>Piece jointe</span>
                    <input
                      type="file"
                      onChange={(event) => setReplyAttachment(event.target.files?.[0] || null)}
                    />
                    <small>{replyAttachment ? replyAttachment.name : "Optionnel"}</small>
                  </label>
                  <button className="nav-btn-solid" type="submit" disabled={sending || !replyMessage.trim()}>
                    {sending ? "Envoi..." : "Envoyer"}
                  </button>
                </div>
              </form>
            )}
          </div>

          <aside className="support-ticket-sidebar">
            <div className="support-ticket-sidebar__card">
              <div className="support-ticket-sidebar__row">
                <span>Reference</span>
                <strong>{ticket.code}</strong>
              </div>
              <div className="support-ticket-sidebar__row">
                <span>Categorie</span>
                <SupportCategoryBadge category={ticket.category} />
              </div>
              <div className="support-ticket-sidebar__row">
                <span>Priorite</span>
                <SupportPriorityBadge priority={ticket.priority} />
              </div>
              <div className="support-ticket-sidebar__row">
                <span>Statut</span>
                <SupportStatusBadge status={ticket.status} />
              </div>
              <div className="support-ticket-sidebar__row">
                <span>Ouvert le</span>
                <strong>{formatSupportDate(ticket.created_at)}</strong>
              </div>
              <div className="support-ticket-sidebar__row">
                <span>Derniere mise a jour</span>
                <strong>{formatSupportDate(ticket.updated_at)}</strong>
              </div>
              <div className="support-ticket-sidebar__row">
                <span>Agent assigne</span>
                <strong>{ticket.assigned_admin_name || "Affectation en cours"}</strong>
              </div>
            </div>

            <div className="support-ticket-sidebar__card">
              <h3>Contexte</h3>
              <div className="support-ticket-sidebar__context">
                <span>Type</span>
                <strong>{getCategoryLabel(ticket.category)}</strong>
              </div>
              <div className="support-ticket-sidebar__context">
                <span>Campagne liee</span>
                {ticket.related_campaign_id ? (
                  <Link className="support-ticket-sidebar__link" to={`/project/${ticket.related_campaign_id}`}>
                    {ticket.related_campaign_title}
                  </Link>
                ) : (
                  <strong>Aucune campagne</strong>
                )}
              </div>
              {ticket.closed_at && (
                <div className="support-ticket-sidebar__context">
                  <span>Cloture</span>
                  <strong>{formatSupportDate(ticket.closed_at)}</strong>
                </div>
              )}
            </div>
          </aside>
        </div>
      ) : null}
    </SupportCenterLayout>
  );
};

export default SupportTicketDetailsPage;

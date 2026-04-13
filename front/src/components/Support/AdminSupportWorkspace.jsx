import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  SupportCategoryBadge,
  SupportPriorityBadge,
  SupportStatusBadge,
} from "./SupportBadges";
import SupportMessageBubble from "./SupportMessageBubble";
import {
  addAdminSupportTicketNote,
  assignAdminSupportTicket,
  getAdminSupportTicket,
  listAdminSupportTickets,
  replyToAdminSupportTicket,
  updateAdminSupportTicket,
} from "../../modules/support/services/supportApi.js";
import {
  adminSupportSortOptions,
  formatSupportDate,
  formatSupportDateInput,
  getCategoryLabel,
  supportCategoryOptions,
  supportPriorityOptions,
  supportStatusOptions,
} from "../../modules/support/utils/supportUtils.js";
import "../../SupportShared.css";
import "./AdminSupportWorkspace.css";

const emptySummary = {
  total_tickets: 0,
  new_unassigned_tickets: 0,
  open_in_progress_tickets: 0,
  awaiting_user_reply_tickets: 0,
  resolved_closed_tickets: 0,
};

const AdminSupportWorkspace = () => {
  const navigate = useNavigate();
  const { ticketId } = useParams();
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const endOfMessagesRef = useRef(null);
  const [tickets, setTickets] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [summary, setSummary] = useState(emptySummary);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    category: "",
    priority: "",
    assignedAdminId: "",
    dateFrom: "",
    dateTo: "",
    sortValue: "last_message_at:DESC",
    page: 1,
  });
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [replyDraft, setReplyDraft] = useState("");
  const [replyAttachment, setReplyAttachment] = useState(null);
  const [replyNextStatus, setReplyNextStatus] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [workflowDraft, setWorkflowDraft] = useState({
    status: "OPEN",
    priority: "MEDIUM",
    category: "GENERAL",
    assignedAdminId: "",
  });
  const [workflowSubmitting, setWorkflowSubmitting] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteSubmitting, setNoteSubmitting] = useState(false);

  const loadTickets = async () => {
    setListLoading(true);
    setListError("");

    try {
      const data = await listAdminSupportTickets(filters);
      setTickets(data.tickets || []);
      setAdmins(data.admins || []);
      setSummary(data.summary || emptySummary);
      setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (loadError) {
      setListError(loadError.message || "Impossible de charger les tickets support.");
    } finally {
      setListLoading(false);
    }
  };

  const loadTicketDetail = async () => {
    if (!ticketId) {
      setDetail(null);
      setDetailError("");
      return;
    }

    setDetailLoading(true);
    setDetailError("");

    try {
      const data = await getAdminSupportTicket(ticketId);
      setDetail(data.ticket);
      setAdmins(data.admins || []);
      setWorkflowDraft({
        status: data.ticket.status || "OPEN",
        priority: data.ticket.priority || "MEDIUM",
        category: data.ticket.category || "GENERAL",
        assignedAdminId: data.ticket.assigned_admin_id || "",
      });
    } catch (loadError) {
      setDetailError(loadError.message || "Impossible de charger ce ticket.");
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [filters]);

  useEffect(() => {
    loadTicketDetail();
  }, [ticketId]);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [detail?.messages?.length]);

  const handleOpenTicket = (id) => {
    navigate(`/admin/support/${id}`);
  };

  const handleReply = async (event) => {
    event.preventDefault();
    setFeedback("");

    if (!detail || !replyDraft.trim()) return;

    setReplySubmitting(true);

    try {
      const data = await replyToAdminSupportTicket(detail.id, {
        message: replyDraft.trim(),
        attachment: replyAttachment,
        next_status: replyNextStatus,
      });

      setDetail(data.ticket);
      setAdmins(data.admins || []);
      setReplyDraft("");
      setReplyAttachment(null);
      setReplyNextStatus("");
      setFeedback(data.message || "La reponse a ete envoyee.");
      loadTickets();
    } catch (replyError) {
      setFeedback(replyError.message || "Impossible d envoyer la reponse.");
    } finally {
      setReplySubmitting(false);
    }
  };

  const handleSaveWorkflow = async () => {
    if (!detail) return;

    setWorkflowSubmitting(true);
    setFeedback("");

    try {
      if (workflowDraft.assignedAdminId !== (detail.assigned_admin_id || "")) {
        await assignAdminSupportTicket(detail.id, workflowDraft.assignedAdminId || null);
      }

      const data = await updateAdminSupportTicket(detail.id, {
        status: workflowDraft.status,
        priority: workflowDraft.priority,
        category: workflowDraft.category,
      });

      setDetail(data.ticket);
      setAdmins(data.admins || []);
      setFeedback(data.message || "Le ticket a ete mis a jour.");
      loadTickets();
    } catch (updateError) {
      setFeedback(updateError.message || "Impossible de mettre a jour ce ticket.");
    } finally {
      setWorkflowSubmitting(false);
    }
  };

  const handleAddNote = async (event) => {
    event.preventDefault();
    if (!detail || !noteDraft.trim()) return;

    setNoteSubmitting(true);
    setFeedback("");

    try {
      const data = await addAdminSupportTicketNote(detail.id, noteDraft.trim());
      setDetail((prev) => ({
        ...(prev || {}),
        internal_notes: [data.internalNote, ...(prev?.internal_notes || [])],
      }));
      setNoteDraft("");
      setFeedback(data.message || "La note interne a ete ajoutee.");
    } catch (noteError) {
      setFeedback(noteError.message || "Impossible d ajouter cette note.");
    } finally {
      setNoteSubmitting(false);
    }
  };

  if (!ticketId) {
    return (
      <div className="admin-support-workspace fade-in">
        <section className="admin-support-summary">
          <article className="admin-support-summary__card">
            <span>Total tickets</span>
            <strong>{summary.total_tickets || 0}</strong>
          </article>
          <article className="admin-support-summary__card">
            <span>Nouveaux / non assignes</span>
            <strong>{summary.new_unassigned_tickets || 0}</strong>
          </article>
          <article className="admin-support-summary__card">
            <span>Ouverts / en cours</span>
            <strong>{summary.open_in_progress_tickets || 0}</strong>
          </article>
          <article className="admin-support-summary__card">
            <span>En attente client</span>
            <strong>{summary.awaiting_user_reply_tickets || 0}</strong>
          </article>
          <article className="admin-support-summary__card">
            <span>Resolus / fermes</span>
            <strong>{summary.resolved_closed_tickets || 0}</strong>
          </article>
        </section>

        <section className="admin-support-filters">
          <input
            type="search"
            placeholder="Rechercher par reference, titre, email..."
            value={filters.search}
            onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value, page: 1 }))}
          />
          <select value={filters.status} onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value, page: 1 }))}>
            <option value="">Tous les statuts</option>
            {supportStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select value={filters.category} onChange={(event) => setFilters((prev) => ({ ...prev, category: event.target.value, page: 1 }))}>
            <option value="">Toutes les categories</option>
            {supportCategoryOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select value={filters.priority} onChange={(event) => setFilters((prev) => ({ ...prev, priority: event.target.value, page: 1 }))}>
            <option value="">Toutes les priorites</option>
            {supportPriorityOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select value={filters.assignedAdminId} onChange={(event) => setFilters((prev) => ({ ...prev, assignedAdminId: event.target.value, page: 1 }))}>
            <option value="">Tous les agents</option>
            <option value="UNASSIGNED">Non assignes</option>
            {admins.map((admin) => (
              <option key={admin.id} value={admin.id}>{admin.name}</option>
            ))}
          </select>
          <input type="date" value={filters.dateFrom} onChange={(event) => setFilters((prev) => ({ ...prev, dateFrom: event.target.value, page: 1 }))} />
          <input type="date" value={filters.dateTo} onChange={(event) => setFilters((prev) => ({ ...prev, dateTo: event.target.value, page: 1 }))} />
          <select value={filters.sortValue} onChange={(event) => setFilters((prev) => ({ ...prev, sortValue: event.target.value, page: 1 }))}>
            {adminSupportSortOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </section>

        {listError && (
          <div className="support-feedback-banner is-error">
            <p>{listError}</p>
          </div>
        )}

        {listLoading ? (
          <section className="support-loading-grid">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="support-skeleton-card" />
            ))}
          </section>
        ) : tickets.length === 0 ? (
          <section className="support-empty-state">
            <div className="support-empty-state__badge">Admin support</div>
            <h2>Aucun ticket ne correspond a ces filtres</h2>
            <p>Ajustez les filtres pour retrouver un ticket ou attendez qu une nouvelle demande arrive.</p>
          </section>
        ) : (
          <section className="admin-table-wrapper">
            <div className="table-header-bar">
              <h4>Support tickets ({pagination.total || tickets.length})</h4>
            </div>
            <div className="admin-support-table-scroll">
              <table className="admin-table admin-support-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Utilisateur</th>
                    <th>Titre</th>
                    <th>Categorie</th>
                    <th>Priorite</th>
                    <th>Statut</th>
                    <th>Assigne</th>
                    <th>Cree le</th>
                    <th>MAJ</th>
                    <th>Campagne</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr key={ticket.id} onClick={() => handleOpenTicket(ticket.id)}>
                      <td className="cell-primary">{ticket.code}</td>
                      <td>
                        <div className="cell-primary">{ticket.user_name}</div>
                        <div className="cell-secondary">{ticket.user_email}</div>
                      </td>
                      <td className="cell-primary">{ticket.title}</td>
                      <td><SupportCategoryBadge category={ticket.category} /></td>
                      <td><SupportPriorityBadge priority={ticket.priority} /></td>
                      <td><SupportStatusBadge status={ticket.status} /></td>
                      <td>{ticket.assigned_admin_name || "Non assigne"}</td>
                      <td>{formatSupportDate(ticket.created_at, false)}</td>
                      <td>{formatSupportDate(ticket.updated_at)}</td>
                      <td>{ticket.related_campaign_title || "Aucune"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {pagination.totalPages > 1 && (
          <div className="support-pagination">
            <button
              type="button"
              className="support-pagination__btn"
              disabled={pagination.page <= 1}
              onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
            >
              Precedent
            </button>
            <span>Page {pagination.page} / {pagination.totalPages}</span>
            <button
              type="button"
              className="support-pagination__btn"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
            >
              Suivant
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="admin-support-workspace fade-in">
      <div className="admin-support-detail-topbar">
        <button type="button" className="action-btn" onClick={() => navigate("/admin/support")}>
          Retour aux tickets
        </button>
        {detail && <span className="admin-support-detail-topbar__code">{detail.code}</span>}
      </div>

      {feedback && (
        <div className={`support-feedback-banner ${feedback.toLowerCase().includes("impossible") ? "is-error" : "is-success"}`}>
          <p>{feedback}</p>
        </div>
      )}

      {detailLoading ? (
        <section className="support-loading-grid">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="support-skeleton-card" />
          ))}
        </section>
      ) : detailError ? (
        <section className="support-empty-state">
          <div className="support-empty-state__badge">Erreur</div>
          <h2>Impossible de charger ce ticket</h2>
          <p>{detailError}</p>
        </section>
      ) : detail && (
        <div className="admin-support-detail-grid">
          <div className="support-conversation-card">
            <div className="support-conversation-card__header">
              <div>
                <h2>{detail.title}</h2>
                <p>{detail.user_name} - {detail.user_email}</p>
              </div>
              <SupportStatusBadge status={detail.status} />
            </div>

            <div className="support-message-thread">
              {detail.messages?.map((message) => (
                <SupportMessageBubble
                  key={message.id}
                  message={message}
                  isOwnMessage={message.sender_role === "ADMIN" && message.sender_id === currentUser.id}
                />
              ))}
              <div ref={endOfMessagesRef} />
            </div>

            <form className="support-reply-form" onSubmit={handleReply}>
              <label>
                <span>Reponse publique</span>
                <textarea
                  rows="5"
                  placeholder="Envoyez une reponse claire et rassurante au client."
                  value={replyDraft}
                  onChange={(event) => setReplyDraft(event.target.value)}
                />
              </label>
              <div className="support-reply-form__footer">
                <label className="support-reply-form__upload">
                  <span>Piece jointe</span>
                  <input type="file" onChange={(event) => setReplyAttachment(event.target.files?.[0] || null)} />
                  <small>{replyAttachment ? replyAttachment.name : "Optionnel"}</small>
                </label>
                <label className="support-reply-form__upload">
                  <span>Nouveau statut (optionnel)</span>
                  <select value={replyNextStatus} onChange={(event) => setReplyNextStatus(event.target.value)}>
                    <option value="">Conserver le statut</option>
                    {supportStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <button className="btn-primary" type="submit" disabled={replySubmitting || !replyDraft.trim()}>
                  {replySubmitting ? "Envoi..." : "Envoyer"}
                </button>
              </div>
            </form>
          </div>

          <aside className="admin-support-sidecolumn">
            <div className="admin-support-sidecard">
              <h3>Informations ticket</h3>
              <div className="admin-support-sidecard__row">
                <span>Client</span>
                <strong>{detail.user_name}</strong>
              </div>
              <div className="admin-support-sidecard__row">
                <span>Email</span>
                <strong>{detail.user_email}</strong>
              </div>
              <div className="admin-support-sidecard__row">
                <span>Cree le</span>
                <strong>{formatSupportDate(detail.created_at)}</strong>
              </div>
              <div className="admin-support-sidecard__row">
                <span>Dernier message</span>
                <strong>{formatSupportDate(detail.last_message_at)}</strong>
              </div>
              <div className="admin-support-sidecard__row">
                <span>Campagne liee</span>
                <strong>{detail.related_campaign_title || "Aucune"}</strong>
              </div>
              {detail.related_campaign_id && (
                <button type="button" className="action-btn admin-support-sidecard__link" onClick={() => navigate(`/project/${detail.related_campaign_id}`)}>
                  Ouvrir la campagne
                </button>
              )}
            </div>

            <div className="admin-support-sidecard">
              <h3>Workflow</h3>
              <label className="admin-support-sidecard__field">
                <span>Assigne a</span>
                <select value={workflowDraft.assignedAdminId} onChange={(event) => setWorkflowDraft((prev) => ({ ...prev, assignedAdminId: event.target.value }))}>
                  <option value="">Non assigne</option>
                  {admins.map((admin) => (
                    <option key={admin.id} value={admin.id}>{admin.name}</option>
                  ))}
                </select>
              </label>
              <label className="admin-support-sidecard__field">
                <span>Statut</span>
                <select value={workflowDraft.status} onChange={(event) => setWorkflowDraft((prev) => ({ ...prev, status: event.target.value }))}>
                  {supportStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="admin-support-sidecard__field">
                <span>Priorite</span>
                <select value={workflowDraft.priority} onChange={(event) => setWorkflowDraft((prev) => ({ ...prev, priority: event.target.value }))}>
                  {supportPriorityOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="admin-support-sidecard__field">
                <span>Categorie</span>
                <select value={workflowDraft.category} onChange={(event) => setWorkflowDraft((prev) => ({ ...prev, category: event.target.value }))}>
                  {supportCategoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <button type="button" className="btn-primary" onClick={handleSaveWorkflow} disabled={workflowSubmitting}>
                {workflowSubmitting ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>

            <div className="admin-support-sidecard">
              <h3>Notes internes</h3>
              <form className="admin-support-notes-form" onSubmit={handleAddNote}>
                <textarea
                  rows="4"
                  placeholder="Note visible uniquement par les administrateurs."
                  value={noteDraft}
                  onChange={(event) => setNoteDraft(event.target.value)}
                />
                <button type="submit" className="action-btn admin-support-notes-form__btn" disabled={noteSubmitting || !noteDraft.trim()}>
                  {noteSubmitting ? "Ajout..." : "Ajouter une note"}
                </button>
              </form>
              <div className="admin-support-notes-list">
                {(detail.internal_notes || []).map((note) => (
                  <article key={note.id} className="admin-support-note">
                    <div className="admin-support-note__top">
                      <strong>{note.admin_name}</strong>
                      <span>{formatSupportDate(note.created_at)}</span>
                    </div>
                    <p>{note.note}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="admin-support-sidecard">
              <h3>Resume</h3>
              <div className="admin-support-sidecard__row">
                <span>Statut actuel</span>
                <SupportStatusBadge status={detail.status} />
              </div>
              <div className="admin-support-sidecard__row">
                <span>Priorite</span>
                <SupportPriorityBadge priority={detail.priority} />
              </div>
              <div className="admin-support-sidecard__row">
                <span>Categorie</span>
                <SupportCategoryBadge category={detail.category} />
              </div>
              <div className="admin-support-sidecard__row">
                <span>Date d ouverture</span>
                <strong>{formatSupportDateInput(detail.created_at)}</strong>
              </div>
              <div className="admin-support-sidecard__row">
                <span>Contexte</span>
                <strong>{getCategoryLabel(detail.category)}</strong>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

export default AdminSupportWorkspace;

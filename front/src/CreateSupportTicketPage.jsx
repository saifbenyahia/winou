import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import "./CreateSupportTicketPage.css";
import SupportCenterLayout from "./components/Support/SupportCenterLayout";
import {
  createSupportTicket,
  getSupportCampaignChoices,
} from "./modules/support/services/supportApi.js";
import {
  supportCategoryOptions,
  supportPriorityOptions,
} from "./modules/support/utils/supportUtils.js";

const CreateSupportTicketPage = ({ onNavigate, isAuthenticated, onLogout }) => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [campaignOptions, setCampaignOptions] = useState([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    title: "",
    category: "GENERAL",
    priority: "MEDIUM",
    message: "",
    related_campaign_id: "",
  });
  const [attachment, setAttachment] = useState(null);

  useEffect(() => {
    if (!token) {
      navigate("/login");
    }
  }, [navigate, token]);

  useEffect(() => {
    if (!token) return undefined;

    let active = true;
    setLoadingCampaigns(true);

    getSupportCampaignChoices()
      .then((options) => {
        if (active) {
          setCampaignOptions(options);
        }
      })
      .catch(() => {
        if (active) {
          setCampaignOptions([]);
        }
      })
      .finally(() => {
        if (active) {
          setLoadingCampaigns(false);
        }
      });

    return () => {
      active = false;
    };
  }, [token]);

  const messageLength = useMemo(() => form.message.trim().length, [form.message]);

  if (!token) return null;

  const validate = () => {
    const nextErrors = {};

    if (!form.title.trim()) {
      nextErrors.title = "Le titre du ticket est obligatoire.";
    }

    if (!form.message.trim()) {
      nextErrors.message = "Decrivez votre demande avec suffisamment de contexte.";
    } else if (form.message.trim().length < 12) {
      nextErrors.message = "Ajoutez quelques details supplementaires pour faciliter le traitement.";
    }

    if (attachment && attachment.size > 10 * 1024 * 1024) {
      nextErrors.attachment = "La piece jointe ne doit pas depasser 10 MB.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFeedback("");

    if (!validate()) return;

    setSubmitting(true);

    try {
      const data = await createSupportTicket({
        ...form,
        attachment,
      });

      navigate(`/support/${data.ticket.id}`, {
        state: {
          feedback: data.message,
        },
      });
    } catch (submitError) {
      setFeedback(submitError.message || "Impossible de creer votre ticket pour le moment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SupportCenterLayout
      onNavigate={onNavigate}
      isAuthenticated={isAuthenticated}
      onLogout={onLogout}
      title="Ouvrir un nouveau ticket"
      subtitle="Une seule page, les bons champs et un ton rassurant pour aider votre equipe support a agir vite."
    >
      <div className="support-create-grid">
        <form className="support-form-card" onSubmit={handleSubmit}>
          <div className="support-form-card__header">
            <div>
              <h2>Parlez-nous de votre demande</h2>
              <p>Plus votre contexte est clair, plus la reponse sera precise et rapide.</p>
            </div>
            <span className="support-form-card__step">Ticket</span>
          </div>

          {feedback && (
            <div className="support-feedback-banner is-error">
              <p>{feedback}</p>
            </div>
          )}

          <div className="support-form-grid">
            <label className="support-form-field support-form-field--full">
              <span>Titre du ticket</span>
              <input
                type="text"
                placeholder="Ex : Je n arrive pas a modifier ma campagne"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              />
              {errors.title && <small>{errors.title}</small>}
            </label>

            <label className="support-form-field">
              <span>Categorie</span>
              <select
                value={form.category}
                onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
              >
                {supportCategoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="support-form-field">
              <span>Priorite</span>
              <select
                value={form.priority}
                onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value }))}
              >
                {supportPriorityOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="support-form-field support-form-field--full">
              <span>Campagne liee (optionnel)</span>
              <select
                value={form.related_campaign_id}
                onChange={(event) => setForm((prev) => ({ ...prev, related_campaign_id: event.target.value }))}
                disabled={loadingCampaigns}
              >
                <option value="">Aucune campagne liee</option>
                {campaignOptions.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.title} ({campaign.origin})
                  </option>
                ))}
              </select>
            </label>

            <label className="support-form-field support-form-field--full">
              <span>Message</span>
              <textarea
                rows="8"
                placeholder="Expliquez le contexte, ce que vous avez deja essaye et le resultat attendu."
                value={form.message}
                onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
              />
              <div className="support-form-field__hint">
                <span>{messageLength}/4000 caracteres</span>
                {errors.message && <small>{errors.message}</small>}
              </div>
            </label>

            <label className="support-form-field support-form-field--full">
              <span>Piece jointe (optionnel)</span>
              <input
                type="file"
                onChange={(event) => setAttachment(event.target.files?.[0] || null)}
              />
              <div className="support-form-field__hint">
                <span>{attachment ? attachment.name : "Capture d ecran, PDF ou document utile"}</span>
                {errors.attachment && <small>{errors.attachment}</small>}
              </div>
            </label>
          </div>

          <div className="support-form-actions">
            <button
              type="button"
              className="nav-btn-outline"
              onClick={() => navigate("/support")}
            >
              Retour aux tickets
            </button>
            <button className="nav-btn-solid" type="submit" disabled={submitting}>
              {submitting ? "Creation..." : "Creer le ticket"}
            </button>
          </div>
        </form>

        <aside className="support-create-sidecard">
          <h3>Pour recevoir une meilleure reponse</h3>
          <ul>
            <li>Donnez un titre simple et specifique.</li>
            <li>Associez la campagne concernee si votre demande en depend.</li>
            <li>Ajoutez le comportement observe et le resultat attendu.</li>
            <li>Joignez une capture si cela permet de comprendre plus vite.</li>
          </ul>
        </aside>
      </div>
    </SupportCenterLayout>
  );
};

export default CreateSupportTicketPage;

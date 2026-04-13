import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";

import "./Home.css";
import "./ProjectDetails.css";
import Navbar from "./Navbar";
import ProjectCommentsSection from "./components/ProjectCommentsSection";
import { buildApiUrl } from "./shared/services/api.js";
import { formatMillimesToTnd, parseTndInput } from "./shared/utils/currency.js";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1528157777178-0062a444aeb8?w=1200&q=80";
const QUICK_SUPPORT_AMOUNTS = [10, 25, 50, 100];

const resolveMediaUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  return buildApiUrl(url);
};

const parseRewards = (rewards) => {
  if (!rewards) return [];
  if (Array.isArray(rewards)) return rewards;
  if (typeof rewards === "string") {
    try {
      const parsed = JSON.parse(rewards);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const parseStory = (story) => {
  if (!story) {
    return { blocks: [], risks: "", faqs: [] };
  }

  let parsed = story;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return { blocks: [], risks: "", faqs: [] };
    }
  }

  return {
    blocks: Array.isArray(parsed?.blocks) ? parsed.blocks : [],
    risks: typeof parsed?.risks === "string" ? parsed.risks : "",
    faqs: Array.isArray(parsed?.faqs) ? parsed.faqs : [],
  };
};

const normalizeCampaign = (campaign) => ({
  ...campaign,
  rewards: parseRewards(campaign?.rewards),
  story: parseStory(campaign?.story),
  image_url: resolveMediaUrl(campaign?.image_url) || FALLBACK_IMAGE,
  video_url: resolveMediaUrl(campaign?.video_url),
});

const hasVisibleStoryContent = (story) => {
  if (!story) return false;

  const hasBlocks = (story.blocks || []).some((block) => {
    if (!block) return false;
    if (block.type === "image" || block.type === "video") {
      return Boolean(block.content);
    }
    return Boolean(String(block.content || "").trim());
  });

  const hasRisks = Boolean(String(story.risks || "").trim());
  const hasFaqs = (story.faqs || []).some((faq) => Boolean(String(faq?.question || faq?.answer || "").trim()));

  return hasBlocks || hasRisks || hasFaqs;
};

const getVideoEmbedUrl = (url) => {
  if (!url) return "";

  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;

  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;

  return url;
};

const getStatusLabel = (status) => {
  if (status === "ACTIVE") return "Active";
  if (status === "PENDING") return "En attente";
  if (status === "DRAFT") return "Brouillon";
  if (status === "REJECTED") return "Refusee";
  if (status === "CLOSED") return "Cloturee";
  return status || "Inconnue";
};

const formatDate = (value) => {
  if (!value) return "Non disponible";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Non disponible";
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
};

const ProjectDetails = ({ onNavigate, isAuthenticated, onLogout, onLoginSuccess }) => {
  const { id: campaignId } = useParams();
  const location = useLocation();
  const supportCardRef = useRef(null);

  const [activeTab, setActiveTab] = useState("story");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [postLoginAction, setPostLoginAction] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [savingInProgress, setSavingInProgress] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [supportAmount, setSupportAmount] = useState("25");
  const [supportError, setSupportError] = useState("");
  const [supportSuccess, setSupportSuccess] = useState("");
  const [supportSubmitting, setSupportSubmitting] = useState(false);

  const supportRequested = useMemo(
    () => new URLSearchParams(location.search).get("support") === "1",
    [location.search]
  );

  useEffect(() => {
    const fetchCampaign = async () => {
      if (!campaignId) {
        setLoading(false);
        setError("Aucune campagne n a ete selectionnee.");
        return;
      }

      try {
        const response = await fetch(buildApiUrl(`/api/campaigns/${campaignId}`));
        const data = await response.json();
        if (!response.ok || !data.success) {
          setError(data.message || "Campagne introuvable.");
          return;
        }

        setCampaign(normalizeCampaign(data.campaign));
      } catch (loadError) {
        console.error("Load campaign error:", loadError);
        setError("Impossible de charger cette campagne.");
      } finally {
        setLoading(false);
      }
    };

    fetchCampaign();
  }, [campaignId]);

  useEffect(() => {
    const checkSavedStatus = async () => {
      const token = localStorage.getItem("token");
      if (!token || !campaignId) return;

      try {
        const response = await fetch(buildApiUrl(`/api/saved/check/${campaignId}`), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (data.success) {
          setIsSaved(Boolean(data.saved));
        }
      } catch (requestError) {
        console.error("Check saved status error:", requestError);
      }
    };

    checkSavedStatus();
  }, [campaignId, isAuthenticated]);

  useEffect(() => {
    if (!campaign || !supportRequested) return;

    const timeout = window.setTimeout(() => {
      supportCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);

    return () => window.clearTimeout(timeout);
  }, [campaign, supportRequested]);

  const handleSaveCampaign = async (tokenOverride) => {
    if (!campaignId) return;

    const token = tokenOverride || localStorage.getItem("token");
    if (!token) {
      setLoginError("");
      setPostLoginAction({ type: "save" });
      setShowLoginModal(true);
      return;
    }

    setSavingInProgress(true);
    try {
      if (isSaved) {
        await fetch(buildApiUrl(`/api/saved/${campaignId}`), {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        setIsSaved(false);
      } else {
        await fetch(buildApiUrl(`/api/saved/${campaignId}`), {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        setIsSaved(true);
      }
    } catch (requestError) {
      console.error("Save campaign error:", requestError);
    } finally {
      setSavingInProgress(false);
    }
  };

  const handleStartSupport = async (tokenOverride, amountOverride = null) => {
    if (!campaign) return;

    if (campaign.status !== "ACTIVE") {
      setSupportError("Cette campagne n accepte pas de soutiens pour le moment.");
      return;
    }

    const rawAmount = amountOverride ?? supportAmount;
    const parsedAmount = parseTndInput(rawAmount);
    if (!parsedAmount || parsedAmount <= 0) {
      setSupportError("Saisissez un montant valide superieur a 0 TND.");
      return;
    }

    const token = tokenOverride || localStorage.getItem("token");
    if (!token) {
      setLoginError("");
      setPostLoginAction({ type: "support", amount: rawAmount });
      setShowLoginModal(true);
      return;
    }

    setSupportSubmitting(true);
    setSupportError("");
    setSupportSuccess("");

    try {
      const response = await fetch(buildApiUrl("/api/pledges"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          campaign_id: campaign.id,
          amount_tnd: String(parsedAmount),
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        if (response.status === 401) {
          setPostLoginAction({ type: "support", amount: rawAmount });
          setShowLoginModal(true);
          setLoginError(data.message || "");
          return;
        }

        setSupportError(data.message || "Impossible d enregistrer votre soutien pour le moment.");
        return;
      }

      if (data.campaign) {
        setCampaign(normalizeCampaign(data.campaign));
      }

      setSupportSuccess("Merci ! Votre soutien a bien ete enregistre sur cette campagne.");
      setSupportAmount("");
    } catch (requestError) {
      console.error("Create support error:", requestError);
      setSupportError("Une erreur reseau est survenue pendant l enregistrement de votre soutien.");
    } finally {
      setSupportSubmitting(false);
    }
  };

  const handleQuickLogin = async () => {
    try {
      const response = await fetch(buildApiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await response.json();
      if (!response.ok) {
        setLoginError(data.message || "Identifiants incorrects");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      const queuedAction = postLoginAction;
      setShowLoginModal(false);
      setLoginError("");
      setPostLoginAction(null);

      if (onLoginSuccess) onLoginSuccess();

      if (queuedAction?.type === "save") {
        await handleSaveCampaign(data.token);
        return;
      }

      if (queuedAction?.type === "support") {
        await handleStartSupport(data.token, queuedAction.amount);
      }
    } catch (requestError) {
      console.error("Quick login error:", requestError);
      setLoginError("Erreur de connexion serveur");
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert("Lien de la campagne copie.");
    } catch {
      alert("Impossible de copier le lien automatiquement.");
    }
  };

  const rewardCount = campaign?.rewards?.length || 0;
  const amountRaised = Number(campaign?.amount_raised ?? campaign?.current_amount ?? 0);
  const fundedPercent = Math.max(0, Math.min(Number(campaign?.funded_percent || 0), 100));
  const backerCount = Number(campaign?.backer_count || 0);
  const parsedSupportAmount = parseTndInput(supportAmount);
  const story = campaign?.story || { blocks: [], risks: "", faqs: [] };
  const storyBlocks = story.blocks || [];
  const storyFaqs = (story.faqs || []).filter((faq) => faq?.question || faq?.answer);
  const hasStoryContent = hasVisibleStoryContent(story);

  const loginModalCopy = postLoginAction?.type === "support"
    ? {
        title: "Connexion requise",
        description: "Connectez-vous pour enregistrer votre soutien et le rattacher a votre compte Hive.tn.",
      }
    : {
        title: "Connexion requise",
        description: "Vous devez etre connecte pour enregistrer cette campagne.",
      };

  if (loading) {
    return (
      <div className="project-details-wrapper">
        <Navbar onNavigate={onNavigate} isAuthenticated={isAuthenticated} onLogout={onLogout} activeTab="projectDetails" />
        <div className="pd-main" style={{ textAlign: "center", paddingTop: "120px" }}>
          <h1 className="pd-title" style={{ fontSize: "32px" }}>Chargement de la campagne...</h1>
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="project-details-wrapper">
        <Navbar onNavigate={onNavigate} isAuthenticated={isAuthenticated} onLogout={onLogout} activeTab="projectDetails" />
        <div className="pd-main" style={{ textAlign: "center", paddingTop: "120px", maxWidth: "760px" }}>
          <h1 className="pd-title" style={{ fontSize: "32px" }}>Campagne indisponible</h1>
          <p className="pd-subtitle">{error || "Cette campagne n existe pas ou n est plus accessible."}</p>
          <button className="pd-back-btn" style={{ maxWidth: "320px", margin: "30px auto 0" }} onClick={() => onNavigate("discover")}>
            Retour a la decouverte
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="project-details-wrapper">
      <Navbar
        onNavigate={onNavigate}
        isAuthenticated={isAuthenticated}
        onLogout={onLogout}
        activeTab="projectDetails"
      />

      <div className="pd-main">
        <div className="pd-header">
          <h1 className="pd-title">{campaign.title}</h1>
          <p className="pd-subtitle">{campaign.description || "Aucune description fournie pour cette campagne."}</p>
        </div>

        <div className="pd-hero-grid">
          <div className="pd-media-column">
            <div className="pd-media-container">
              {campaign.video_url ? (
                <video className="pd-media-img" controls poster={campaign.image_url || FALLBACK_IMAGE}>
                  <source src={campaign.video_url} />
                </video>
              ) : (
                <img src={campaign.image_url || FALLBACK_IMAGE} alt={campaign.title} className="pd-media-img" />
              )}
            </div>

            <div className="pd-badges" style={{ flexWrap: "wrap" }}>
              <div className="pd-badge-item">
                <span className="pd-badge-icon">Categorie</span> {campaign.category || "Non categorisee"}
              </div>
              <div className="pd-badge-item">
                <span className="pd-badge-icon">Porteur</span> {campaign.creator_name || "Createur inconnu"}
              </div>
              <div className="pd-badge-item">
                <span className="pd-badge-icon">Statut</span> {getStatusLabel(campaign.status)}
              </div>
            </div>
          </div>

          <div className="pd-stats-block">
            <div className="pd-progress-bar">
              <div className="pd-progress-fill" style={{ width: `${fundedPercent}%` }}></div>
            </div>

            <div className="pd-stat-group">
              <div className="pd-stat-big">{formatMillimesToTnd(amountRaised)}</div>
              <div className="pd-stat-label">montant atteint</div>
            </div>

            <div className="pd-stat-group">
              <div className="pd-stat-big white">{fundedPercent}%</div>
              <div className="pd-stat-label">de l objectif atteint</div>
            </div>

            <div className="pd-stat-group">
              <div className="pd-stat-big white">{formatMillimesToTnd(campaign.target_amount)}</div>
              <div className="pd-stat-label">objectif de la campagne</div>
            </div>

            <div className="pd-stat-group">
              <div className="pd-stat-big white">{backerCount}</div>
              <div className="pd-stat-label">soutien{backerCount > 1 ? "s" : ""} confirme{backerCount > 1 ? "s" : ""}</div>
            </div>

            <div className="pd-stat-group">
              <div className="pd-stat-big white">{formatDate(campaign.created_at)}</div>
              <div className="pd-stat-label">date de creation</div>
            </div>

            <div className="pd-support-panel" ref={supportCardRef}>
              <div className="pd-support-panel__header">
                <div>
                  <p className="pd-support-panel__eyebrow">Soutien direct</p>
                  <h2>Soutenir cette campagne</h2>
                </div>
                <span className="pd-support-panel__chip">TND</span>
              </div>

              <div className="pd-support-panel__summary">
                <div>
                  <span>Campagne</span>
                  <strong>{campaign.title}</strong>
                </div>
                <div>
                  <span>Soutiens confirmes</span>
                  <strong>{backerCount}</strong>
                </div>
              </div>

              <label className="pd-support-field">
                <span>Montant de soutien</span>
                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={supportAmount}
                  onChange={(event) => {
                    setSupportAmount(event.target.value);
                    if (supportError) setSupportError("");
                    if (supportSuccess) setSupportSuccess("");
                  }}
                  placeholder="25"
                />
                <small>Montant en dinars tunisiens. Votre soutien est enregistre immediatement sur Hive.tn.</small>
              </label>

              <div className="pd-support-quick-list">
                {QUICK_SUPPORT_AMOUNTS.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    className={`pd-support-chip ${parsedSupportAmount === amount ? "is-active" : ""}`}
                    onClick={() => {
                      setSupportAmount(String(amount));
                      if (supportError) setSupportError("");
                      if (supportSuccess) setSupportSuccess("");
                    }}
                  >
                    {amount} TND
                  </button>
                ))}
              </div>

              {supportError && <p className="pd-support-feedback is-error">{supportError}</p>}
              {supportSuccess && <p className="pd-support-feedback is-success">{supportSuccess}</p>}

              <p className="pd-support-feedback">
                {campaign.status === "ACTIVE"
                  ? "Chaque soutien confirme met a jour la collecte de la campagne et reste visible dans votre profil."
                  : "Cette campagne ne peut pas recevoir de soutien tant qu elle n est pas active."}
              </p>

              <button
                type="button"
                className="pd-support-btn"
                disabled={campaign.status !== "ACTIVE" || supportSubmitting}
                onClick={() => handleStartSupport()}
              >
                {supportSubmitting ? "Enregistrement du soutien..." : "Soutenir maintenant"}
              </button>
            </div>

            <div className="pd-actions-row">
              <button
                className={`pd-remind-btn ${isSaved ? "pd-saved-active" : ""}`}
                disabled={savingInProgress}
                onClick={() => handleSaveCampaign()}
              >
                {isSaved ? "Enregistree" : "Enregistrer"}
              </button>
              <div className="pd-social-btn" onClick={handleCopyLink} role="button" tabIndex={0}>Copier</div>
            </div>

            <div className="pd-warning-text">
              <strong>Soutien confirme.</strong> Votre contribution est rattachee a votre compte Hive.tn et met a jour la collecte de la campagne.
            </div>
          </div>
        </div>
      </div>

      <div className="pd-layout-container" style={{ position: "relative", zIndex: 1, boxSizing: "border-box" }}>
        <aside className="pd-sidebar-nav">
          <div className="pd-sidebar-menu" role="tablist" aria-label="Navigation du projet">
            <span className={`pd-tab-vertical ${activeTab === "story" ? "active" : ""}`} onClick={() => setActiveTab("story")} role="tab" aria-selected={activeTab === "story"} tabIndex={0}>Histoire</span>
            <span className={`pd-tab-vertical ${activeTab === "rewards" ? "active" : ""}`} onClick={() => setActiveTab("rewards")} role="tab" aria-selected={activeTab === "rewards"} tabIndex={0}>Recompenses <span className="pd-tab-count">{rewardCount}</span></span>
            <span className={`pd-tab-vertical ${activeTab === "comments" ? "active" : ""}`} onClick={() => setActiveTab("comments")} role="tab" aria-selected={activeTab === "comments"} tabIndex={0}>Commentaires <span className="pd-tab-count">{commentCount}</span></span>
            <span className={`pd-tab-vertical ${activeTab === "campaign" ? "active" : ""}`} onClick={() => setActiveTab("campaign")} role="tab" aria-selected={activeTab === "campaign"} tabIndex={0}>Description</span>
          </div>
        </aside>

        <main className="pd-sidebar-content">
          {activeTab === "campaign" && (
            <div>
              <h2>Description du projet</h2>
              <p>{campaign.description || "Aucune description fournie pour cette campagne."}</p>
            </div>
          )}

          {activeTab === "story" && (
            hasStoryContent ? (
              <div>
                <h2>Histoire du projet</h2>
                <div className="pd-story-flow">
                  {storyBlocks.map((block, index) => {
                    if (!block) return null;

                    if (block.type === "image" && block.content) {
                      return (
                        <div key={block.id || `story-image-${index}`} className="pd-story-media-card">
                          <img
                            src={resolveMediaUrl(block.content)}
                            alt={block.fileName || `Illustration ${index + 1}`}
                            className="pd-story-image"
                          />
                        </div>
                      );
                    }

                    if (block.type === "video" && block.content) {
                      return (
                        <div key={block.id || `story-video-${index}`} className="pd-story-media-card">
                          <iframe
                            src={getVideoEmbedUrl(block.content)}
                            title={`Video du projet ${index + 1}`}
                            className="pd-story-video"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      );
                    }

                    const content = String(block.content || "").trim();
                    if (!content) return null;

                    if (block.type === "heading") {
                      return <h3 key={block.id || `story-heading-${index}`} className="pd-story-heading">{content}</h3>;
                    }

                    if (block.type === "subheading") {
                      return <h4 key={block.id || `story-subheading-${index}`} className="pd-story-subheading">{content}</h4>;
                    }

                    if (block.type === "list") {
                      const items = content
                        .split("\n")
                        .map((item) => item.replace(/^[•*\-\s]+/, "").trim())
                        .filter(Boolean);

                      if (items.length === 0) return null;

                      return (
                        <ul key={block.id || `story-list-${index}`} className="pd-story-list">
                          {items.map((item, itemIndex) => (
                            <li key={`${block.id || "story-list"}-${itemIndex}`}>{item}</li>
                          ))}
                        </ul>
                      );
                    }

                    return <p key={block.id || `story-paragraph-${index}`} className="pd-story-paragraph">{content}</p>;
                  })}
                </div>

                {story.risks && story.risks.trim() && (
                  <section className="pd-story-section">
                    <h2>Risques et defis</h2>
                    <p className="pd-story-paragraph">{story.risks}</p>
                  </section>
                )}

                {storyFaqs.length > 0 && (
                  <section className="pd-story-section">
                    <h2>Foire aux questions</h2>
                    <div className="pd-faq-list">
                      {storyFaqs.map((faq, index) => (
                        <article key={`${faq.question || "faq"}-${index}`} className="pd-faq-card">
                          <h3 className="pd-faq-question">{faq.question || `Question ${index + 1}`}</h3>
                          <p className="pd-faq-answer">{faq.answer || "Reponse a venir."}</p>
                        </article>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            ) : (
              <div>
                <h2>Histoire</h2>
                <p>Le createur n a pas encore publie l histoire detaillee de cette campagne.</p>
              </div>
            )
          )}

          {activeTab === "rewards" && (
            rewardCount > 0 ? (
              <div>
                <h2>Recompenses proposees</h2>
                <div style={{ display: "grid", gap: "14px" }}>
                  {campaign.rewards.map((reward, index) => (
                    <div key={`${reward.title || "reward"}-${index}`} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "18px", background: "rgba(255,255,255,0.02)" }}>
                      {(reward.image || reward.image_url) && (
                        <img
                          src={resolveMediaUrl(reward.image || reward.image_url)}
                          alt={reward.title || `Recompense ${index + 1}`}
                          style={{ width: "100%", maxHeight: "220px", objectFit: "cover", borderRadius: "10px", marginBottom: "14px" }}
                        />
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "center", marginBottom: "8px" }}>
                        <strong style={{ color: "#fff", fontSize: "18px" }}>{reward.title || `Recompense ${index + 1}`}</strong>
                        <span style={{ color: "#0ce688", fontWeight: 800 }}>{reward.price ? `${reward.price} DT` : "Montant libre"}</span>
                      </div>
                      <p style={{ margin: 0, color: "#c9d1d9", lineHeight: "1.6" }}>{reward.desc || "Aucune description pour cette recompense."}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <h2>Recompenses</h2>
                <p>Cette campagne ne contient actuellement aucune recompense enregistree.</p>
              </div>
            )
          )}

          {activeTab === "comments" && (
            <ProjectCommentsSection
              campaignId={campaign.id}
              isAuthenticated={isAuthenticated}
              onNavigate={onNavigate}
              onCountChange={setCommentCount}
            />
          )}
        </main>
      </div>

      {showLoginModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.85)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#111", padding: "40px", borderRadius: "12px", width: "400px", maxWidth: "90%", border: "1px solid rgba(255,255,255,0.1)", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ color: "#fff", fontSize: "24px", margin: 0 }}>{loginModalCopy.title}</h2>
              <button onClick={() => { setShowLoginModal(false); setPostLoginAction(null); setLoginError(""); }} style={{ background: "transparent", border: "none", color: "#a1a1aa", fontSize: "24px", cursor: "pointer" }}>×</button>
            </div>
            <p style={{ color: "#a1a1aa", marginBottom: "30px", lineHeight: "1.5" }}>
              {loginModalCopy.description}
            </p>

            {loginError && <div style={{ color: "#ff4d4f", marginBottom: "20px", padding: "10px", background: "rgba(255,77,79,0.1)", borderRadius: "6px" }}>{loginError}</div>}

            <input
              type="email"
              placeholder="Adresse e-mail"
              value={loginEmail}
              onChange={(event) => setLoginEmail(event.target.value)}
              style={{ width: "100%", padding: "14px", marginBottom: "15px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", borderRadius: "8px", boxSizing: "border-box" }}
            />
            <input
              type="password"
              placeholder="Mot de passe"
              value={loginPassword}
              onChange={(event) => setLoginPassword(event.target.value)}
              style={{ width: "100%", padding: "14px", marginBottom: "25px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", borderRadius: "8px", boxSizing: "border-box", fontFamily: "sans-serif" }}
            />

            <button
              onClick={handleQuickLogin}
              style={{ width: "100%", padding: "16px", backgroundColor: "#05ce78", color: "#111", fontWeight: "800", fontSize: "16px", border: "none", borderRadius: "8px", cursor: "pointer", marginBottom: "15px", display: "flex", justifyContent: "center" }}
            >
              Se connecter
            </button>
            <div style={{ textAlign: "center", color: "#a1a1aa", fontSize: "14px" }}>
              Pas encore de compte ? <span onClick={() => { setShowLoginModal(false); setPostLoginAction(null); onNavigate("signUp"); }} style={{ color: "#0ce688", cursor: "pointer" }}>S inscrire</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetails;

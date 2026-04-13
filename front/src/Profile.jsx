import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import "./Home.css";
import "./Profile.css";
import "./Settings.css";
import Navbar from "./Navbar";
import ProjectCard from "./components/ProjectCard";
import { buildApiUrl } from "./shared/services/api.js";
import { formatMillimesToTnd } from "./shared/utils/currency.js";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1528157777178-0062a444aeb8?w=800&q=80";

const getStatusBadge = (status) => {
  if (status === "DRAFT") return { bg: "#6b7280", text: "Brouillon" };
  if (status === "PENDING") return { bg: "#f59e0b", text: "En attente" };
  if (status === "ACTIVE") return { bg: "#05ce78", text: "Active" };
  if (status === "REJECTED") return { bg: "#ef4444", text: "Refusee" };
  if (status === "CLOSED") return { bg: "#374151", text: "Fermee" };
  return { bg: "rgba(0,0,0,0.6)", text: status || "Inconnu" };
};

const getCampaignLockNotice = (status) => {
  if (status === "PENDING") {
    return {
      eyebrow: "Campagne en verification",
      title: "Votre campagne est en cours d'examen.",
      message: "Notre equipe la verifie avant publication. Vous recevrez une notification des qu'une nouvelle action sera possible.",
    };
  }

  if (status === "ACTIVE") {
    return {
      eyebrow: "Campagne deja en ligne",
      title: "Votre campagne est actuellement active.",
      message: "Pour garantir une experience claire aux contributeurs, cette version n'est plus modifiable depuis cet espace.",
    };
  }

  if (status === "CLOSED") {
    return {
      eyebrow: "Campagne terminee",
      title: "Cette campagne est maintenant cloturee.",
      message: "Elle reste visible dans votre espace, mais son contenu ne peut plus etre modifie.",
    };
  }

  return {
    eyebrow: "Modification indisponible",
    title: "Cette campagne ne peut pas etre modifiee pour le moment.",
    message: "Consultez son statut pour savoir quand de nouvelles modifications seront a nouveau disponibles.",
  };
};

const Profile = ({ onNavigate, isAuthenticated, onLogout }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("created");
  const [createdProjects, setCreatedProjects] = useState([]);
  const [backedProjects, setBackedProjects] = useState([]);
  const [loadingCreated, setLoadingCreated] = useState(true);
  const [loadingBacked, setLoadingBacked] = useState(true);
  const [campaignNotice, setCampaignNotice] = useState(null);

  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userName = storedUser.name || "Utilisateur";
  const userEmail = storedUser.email || "";
  const userInitials = userName.split(" ").map((word) => word[0]).join("").toUpperCase().slice(0, 2);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoadingCreated(false);
      setLoadingBacked(false);
      return;
    }

    const fetchCreatedCampaigns = async () => {
      setLoadingCreated(true);
      try {
        const response = await fetch(buildApiUrl("/api/campaigns/my"), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (data.success) {
          const projects = data.campaigns.map((campaign) => ({
            id: campaign.id,
            title: campaign.title || "Projet sans titre",
            creator: `Par ${userName} (Vous)`,
            desc: campaign.description || "",
            image: campaign.image_url ? buildApiUrl(campaign.image_url) : FALLBACK_IMAGE,
            funded: Number(campaign.funded_percent || 0),
            collected: formatMillimesToTnd(campaign.amount_raised || 0),
            daysLeft: "--",
            category: campaign.category || "Non categorise",
            dbStatus: campaign.status,
            paidDonationCount: Number(campaign.paid_donation_count || 0),
          }));
          setCreatedProjects(projects);
        }
      } catch (error) {
        console.error("Erreur lors du chargement des campagnes creees:", error);
      } finally {
        setLoadingCreated(false);
      }
    };

    const fetchBackedCampaigns = async () => {
      setLoadingBacked(true);
      try {
        const response = await fetch(buildApiUrl("/api/pledges/my"), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (data.success) {
          const projects = data.campaigns.map((campaign) => ({
            id: campaign.id,
            title: campaign.title || "Projet soutenu",
            creator: campaign.creator_name ? `Par ${campaign.creator_name}` : "Createur inconnu",
            desc: campaign.description || "",
            image: campaign.image_url ? buildApiUrl(campaign.image_url) : FALLBACK_IMAGE,
            funded: Number(campaign.funded_percent || 0),
            collected: formatMillimesToTnd(campaign.total_contributed),
            daysLeft: "--",
            category: campaign.category || "Non categorise",
            dbStatus: campaign.status,
            pledgeCount: campaign.pledge_count || 0,
            lastSupportedAt: campaign.last_supported_at || "",
          }));
          setBackedProjects(projects);
        }
      } catch (error) {
        console.error("Erreur lors du chargement des campagnes soutenues:", error);
      } finally {
        setLoadingBacked(false);
      }
    };

    fetchCreatedCampaigns();
    fetchBackedCampaigns();
  }, [userName]);

  const supportedCount = backedProjects.length;
  const superbackerGoal = 25;
  const superbackerProgress = Math.min((supportedCount / superbackerGoal) * 100, 100);

  return (
    <div className="profile-page-wrapper">
      <div className="profile-privacy-banner">
        <div className="banner-text">
          <span style={{ color: "#0ce688", fontSize: "18px" }}>???</span>
          Cette page de profil n'est visible que par vous.
        </div>
        <button className="banner-btn" onClick={() => onNavigate("settings")}>Gerer vos parametres de confidentialite</button>
      </div>

      <Navbar onNavigate={onNavigate} isAuthenticated={isAuthenticated} onLogout={onLogout} activeTab="profile" />

      <div className="profile-main">
        <div className="profile-header">
          <div className="profile-large-avatar">
            {storedUser.avatar ? (
              <img src={storedUser.avatar} alt={userName} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "linear-gradient(135deg, #0ce688, #0ab56b)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "42px", fontWeight: "800", color: "#0b0f19" }}>
                {userInitials}
              </div>
            )}
          </div>
          <h1 className="profile-name">{userName}</h1>
          <div className="profile-meta">
            {userEmail} · Soutenu {supportedCount} projet{supportedCount > 1 ? "s" : ""}
          </div>
        </div>

        <div className="superbacker-card">
          <div className="superbacker-icon">?</div>
          <div className="superbacker-content">
            <div className="superbacker-title">
              {supportedCount} sur {superbackerGoal} projets avant le statut Super-Contributeur Hive
            </div>
            <a className="superbacker-link" onClick={() => {}}>En savoir plus sur le statut de Super-Contributeur</a>
            <div className="superbacker-progress-bg">
              <div className="superbacker-progress-fill" style={{ width: `${superbackerProgress}%` }}></div>
            </div>
            <button className="nav-btn-solid" style={{ padding: "8px 24px", fontSize: "14px" }} onClick={() => onNavigate("discover")}>
              Soutenir des projets
            </button>
          </div>
        </div>

        <div className="profile-tabs-container">
          <div className="profile-tabs" role="tablist" aria-label="Onglets du profil">
            <span
              className={`profile-tab ${activeTab === "about" ? "active" : ""}`}
              onClick={() => setActiveTab("about")}
              role="tab"
              aria-selected={activeTab === "about"}
              tabIndex={0}
              onKeyDown={(event) => event.key === "Enter" && setActiveTab("about")}
            >
              A propos
            </span>
            <span
              className={`profile-tab ${activeTab === "backed" ? "active" : ""}`}
              onClick={() => setActiveTab("backed")}
              role="tab"
              aria-selected={activeTab === "backed"}
              tabIndex={0}
              onKeyDown={(event) => event.key === "Enter" && setActiveTab("backed")}
            >
              Soutenus <span>{loadingBacked ? "..." : supportedCount}</span>
            </span>
            <span
              className={`profile-tab ${activeTab === "created" ? "active" : ""}`}
              onClick={() => setActiveTab("created")}
              role="tab"
              aria-selected={activeTab === "created"}
              tabIndex={0}
              onKeyDown={(event) => event.key === "Enter" && setActiveTab("created")}
            >
              Crees <span>{loadingCreated ? "..." : createdProjects.length}</span>
            </span>
          </div>
        </div>

        {campaignNotice && activeTab === "created" && (
          <div className="profile-notice-card" role="status" aria-live="polite">
            <div className="profile-notice-card__content">
              <span className="profile-notice-card__eyebrow">{campaignNotice.eyebrow}</span>
              <h3>{campaignNotice.title}</h3>
              <p>{campaignNotice.message}</p>
            </div>
            <button
              type="button"
              className="profile-notice-card__close"
              onClick={() => setCampaignNotice(null)}
              aria-label="Fermer le message"
            >
              Fermer
            </button>
          </div>
        )}

        {activeTab === "about" && (
          storedUser.bio ? (
            <div className="profile-content-empty" style={{ textAlign: "left" }}>
              <h3>Biographie</h3>
              <p style={{ lineHeight: "1.7", color: "#d4d4d8", whiteSpace: "pre-wrap" }}>{storedUser.bio}</p>
              <button className="settings-btn-outline" onClick={() => onNavigate("settings")} style={{ marginTop: "16px" }}>Modifier la bio</button>
            </div>
          ) : (
            <div className="profile-content-empty">
              <h3>Aucune biographie</h3>
              <p>Vous n'avez pas encore ajoute de description a votre profil public.</p>
              <button className="settings-btn-outline" onClick={() => onNavigate("settings")}>Ajouter une bio</button>
            </div>
          )
        )}

        {activeTab === "backed" && (
          <div className="projects-section" style={{ padding: "0", maxWidth: "100%" }}>
            {loadingBacked ? (
              <p style={{ color: "#a1a1aa" }}>Chargement de vos soutiens...</p>
            ) : backedProjects.length === 0 ? (
              <div className="profile-content-empty">
                <h3>Vous n'avez soutenu aucun projet.</h3>
                <p>Il est temps de changer ca ! Decouvrez des idees innovantes.</p>
                <button className="settings-btn-outline" onClick={() => onNavigate("discover")} style={{ color: "#05ce78", borderColor: "#05ce78" }}>
                  Decouvrir des projets
                </button>
              </div>
            ) : (
              <div className="projects-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))" }}>
                {backedProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onNavigate={onNavigate}
                    overlay={
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-start" }}>
                        <span style={{ backgroundColor: "rgba(5, 206, 120, 0.92)", color: "#08150f", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: "bold" }}>
                          Soutenu
                        </span>
                        <span style={{ backgroundColor: "rgba(0,0,0,0.62)", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: "bold" }}>
                          Votre total : {project.collected}
                        </span>
                      </div>
                    }
                    actions={
                      <button
                        className="settings-btn-outline"
                        style={{ width: "100%", borderColor: "#05ce78", color: "#05ce78" }}
                        onClick={(event) => {
                          event.stopPropagation();
                          onNavigate("projectDetails", project.id);
                        }}
                      >
                        Voir la campagne
                      </button>
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "created" && (
          <div className="projects-section" style={{ padding: "0", maxWidth: "100%" }}>
            {loadingCreated ? (
              <p style={{ color: "#a1a1aa" }}>Chargement de vos projets...</p>
            ) : createdProjects.length === 0 ? (
              <div className="profile-content-empty">
                <h3>Vous n'avez cree aucun projet.</h3>
                <p>Commencez a donner vie a vos idees des maintenant !</p>
                <button className="settings-btn-outline" onClick={() => onNavigate("startProject")} style={{ color: "#0ce688", borderColor: "#0ce688" }}>
                  Demarrer un projet
                </button>
              </div>
            ) : (
              <div className="projects-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))" }}>
                {createdProjects.map((project) => {
                  const statusBadge = getStatusBadge(project.dbStatus);

                  return (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onNavigate={onNavigate}
                      overlay={
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-start" }}>
                          <span style={{ backgroundColor: statusBadge.bg, padding: "4px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: "bold" }}>
                            {statusBadge.text}
                          </span>
                          <span style={{ backgroundColor: "rgba(0,0,0,0.62)", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: "bold" }}>
                            {project.paidDonationCount} don{project.paidDonationCount > 1 ? "s" : ""} paye{project.paidDonationCount > 1 ? "s" : ""}
                          </span>
                        </div>
                      }
                      actions={
                        <button
                          className="settings-btn-outline"
                          style={{ width: "100%", borderColor: "#05ce78", color: "#05ce78" }}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (project.dbStatus === "DRAFT" || project.dbStatus === "REJECTED") {
                              navigate(`/editor/${project.id}`);
                            } else {
                              setCampaignNotice(getCampaignLockNotice(project.dbStatus));
                            }
                          }}
                        >
                          Gerer la campagne
                        </button>
                      }
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;

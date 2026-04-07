import React, { useEffect, useState } from "react";

import "./Home.css";
import "./SavedProjects.css";
import Navbar from "./Navbar";
import ProjectCard from "./components/ProjectCard";
import { buildApiUrl } from "./lib/api";

const SavedProjects = ({ onNavigate, isAuthenticated, onLogout }) => {
  const [savedProjects, setSavedProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSaved = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(buildApiUrl("/api/saved"), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (data.success) {
          setSavedProjects(data.campaigns.map((campaign) => ({
            id: campaign.id,
            title: campaign.title,
            creator: `Par ${campaign.creator_name}`,
            desc: campaign.description || "",
            image: campaign.image_url
              ? buildApiUrl(campaign.image_url)
              : "https://images.unsplash.com/photo-1592982537447-6f2e8f17ba81?w=800&q=80",
            funded: Number(campaign.funded_percent || 0),
            collected: `${(Number(campaign.amount_raised || 0) / 1000).toLocaleString("fr-FR")} DT`,
            daysLeft: "--",
            category: campaign.category || "Projet",
          })));
        }
      } catch (error) {
        console.error("Fetch saved error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSaved();
  }, []);

  const handleUnsave = async (campaignId) => {
    const token = localStorage.getItem("token");
    try {
      await fetch(buildApiUrl(`/api/saved/${campaignId}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setSavedProjects((previous) => previous.filter((project) => project.id !== campaignId));
    } catch (error) {
      console.error("Unsave error:", error);
    }
  };

  return (
    <div className="saved-page-wrapper">
      <Navbar
        onNavigate={onNavigate}
        isAuthenticated={isAuthenticated}
        onLogout={onLogout}
        activeTab="saved"
      />

      <div className="saved-main">
        <div className="saved-header">
          <div className="saved-icon-badge">🔖</div>
          <h1 className="saved-title">Projets Enregistres</h1>
          <p className="saved-subtitle">Retrouvez ici les perles rares que vous avez mises de cote pour les soutenir plus tard.</p>
        </div>

        {loading && (
          <div style={{ textAlign: "center", color: "#a1a1aa", padding: "60px 0" }}>
            Chargement...
          </div>
        )}

        {!loading && savedProjects.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px 20px" }}>
            <div style={{ fontSize: "64px", marginBottom: "20px" }}>📭</div>
            <h3 style={{ color: "#fff", fontSize: "24px", marginBottom: "12px" }}>Aucun projet enregistre</h3>
            <p style={{ color: "#a1a1aa", fontSize: "16px", lineHeight: "1.6", maxWidth: "450px", margin: "0 auto 30px auto" }}>
              Parcourez les projets et cliquez sur "Enregistrer" pour les retrouver ici plus tard.
            </p>
            <button
              className="nav-btn-solid"
              style={{ padding: "14px 32px", fontSize: "16px" }}
              onClick={() => onNavigate("discover")}
            >
              Decouvrir des projets
            </button>
          </div>
        )}

        {!loading && savedProjects.length > 0 && (
          <div className="projects-section" style={{ padding: "0", maxWidth: "100%" }}>
            <div className="projects-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))" }}>
              {savedProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onNavigate={onNavigate}
                  overlay={<>🔖 Enregistre</>}
                  actions={
                    <div style={{ display: "flex", gap: "10px", width: "100%" }}>
                      <button
                        className="nav-btn-solid"
                        style={{ flex: 1, padding: "10px", fontSize: "15px" }}
                        onClick={(event) => {
                          event.stopPropagation();
                          onNavigate("donationPage", project.id);
                        }}
                      >
                        Soutenir
                      </button>
                      <button
                        className="nav-btn-solid"
                        style={{ padding: "10px 16px", fontSize: "15px", background: "rgba(255, 77, 79, 0.15)", color: "#ff4d4f", border: "1px solid rgba(255, 77, 79, 0.3)" }}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleUnsave(project.id);
                        }}
                      >
                        Retirer
                      </button>
                    </div>
                  }
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedProjects;

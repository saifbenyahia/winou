import React, { useEffect, useState } from "react";

import "./Home.css";
import "./Discover.css";
import Navbar from "./Navbar";
import { buildApiUrl } from "./lib/api";
import { formatMillimesToTnd } from "./utils/currency";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80";

const resolveMediaUrl = (url) => {
  if (!url) return FALLBACK_IMAGE;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  return buildApiUrl(url);
};

const Discover = ({ onNavigate, isAuthenticated, onLogout }) => {
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [filterCategory, setFilterCategory] = useState("Toutes les categories");
  const [filterSort, setFilterSort] = useState("Nouveautes");
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const response = await fetch(buildApiUrl("/api/campaigns"));
        const data = await response.json();
        if (data.success) {
          setCampaigns(data.campaigns);
        }
      } catch (error) {
        console.error("Failed to fetch campaigns:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, []);

  const displayProjects = campaigns.map((campaign) => ({
    id: campaign.id,
    title: campaign.title,
    creatorName: campaign.creator_name || "Createur inconnu",
    creatorAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80",
    image: resolveMediaUrl(campaign.image_url),
    fundedPercent: Number(campaign.funded_percent || 0),
    statusMessage: `${campaign.category || "Projet"} • ${formatMillimesToTnd(campaign.amount_raised || 0)} sur ${formatMillimesToTnd(campaign.target_amount)}`,
    category: campaign.category || "Projet",
  }));

  const filteredProjects = filterCategory === "Toutes les categories"
    ? displayProjects
    : displayProjects.filter((project) => project.category === filterCategory);

  const projectsToShow = [...filteredProjects].sort((a, b) => {
    if (filterSort === "Popularite") return a.title.localeCompare(b.title);
    if (filterSort === "Fin de campagne") return a.title.localeCompare(b.title);
    return 0;
  });

  return (
    <div className="discover-page-wrapper">
      <Navbar
        onNavigate={onNavigate}
        isAuthenticated={isAuthenticated}
        onLogout={onLogout}
        activeTab="discover"
      />

      <div className="discover-main">
        <div className="discover-filter-section">
          <div className="discover-filter-text">
            <span>Afficher </span>

            <div className="custom-dropdown-container">
              <button className="inline-dropdown-btn" onClick={() => setShowCategoryMenu(!showCategoryMenu)}>
                {filterCategory} <span style={{ marginLeft: "8px", fontSize: "14px", color: "#0ce688" }}>{showCategoryMenu ? "?" : "?"}</span>
              </button>
              {showCategoryMenu && (
                <div className="custom-dropdown-menu">
                  <div className="custom-dropdown-item" onClick={() => { setFilterCategory("Toutes les categories"); setShowCategoryMenu(false); }}>Toutes les categories</div>
                  {[...new Set(displayProjects.map((project) => project.category))].map((category) => (
                    <div key={category} className="custom-dropdown-item" onClick={() => { setFilterCategory(category); setShowCategoryMenu(false); }}>
                      {category}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <span>tries par</span>
            <select
              className="discover-dropdown"
              value={filterSort}
              onChange={(event) => setFilterSort(event.target.value)}
            >
              <option>Nouveautes</option>
              <option>Popularite</option>
              <option>Fin de campagne</option>
            </select>
          </div>
        </div>

        <div className="explore-results-container">
          <div className="explore-results-title">
            Explorer <span>{loading ? "..." : `${projectsToShow.length} projets`}</span>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "60px", color: "#a1a1aa" }}>
              Chargement des projets...
            </div>
          ) : projectsToShow.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px", color: "#a1a1aa" }}>
              Aucune campagne active disponible pour le moment.
            </div>
          ) : (
            <div className="ks-grid">
              {projectsToShow.map((project) => (
                <div key={project.id} className="ks-card" onClick={() => onNavigate("projectDetails", project.id)}>
                  <div className="ks-card-image-box">
                    <img src={project.image} alt={project.title} className="ks-card-image" loading="lazy" />
                    <div className="ks-progress-line" style={{ width: `${Math.min(project.fundedPercent, 100)}%` }}></div>
                  </div>

                  <div className="ks-card-content">
                    <div className="ks-card-top-row">
                      <img src={project.creatorAvatar} alt={project.creatorName} className="ks-creator-avatar" loading="lazy" />
                      <div className="ks-card-title-col">
                        <h3 className="ks-card-title">{project.title}</h3>
                        <button
                          className="ks-bookmark-btn"
                          onClick={(event) => {
                            event.stopPropagation();
                            onNavigate("projectDetails", project.id);
                          }}
                        >
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z"></path></svg>
                        </button>
                      </div>
                    </div>

                    <div className="ks-creator-name">
                      Par {project.creatorName}
                    </div>

                    <div className="ks-card-stats">
                      <svg className="ks-clock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                      <span>{project.statusMessage}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Discover;

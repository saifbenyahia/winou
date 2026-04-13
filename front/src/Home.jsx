import React, { useEffect, useState } from 'react';
import './Home.css';
import Navbar from './Navbar';
import ProjectCard from './components/ProjectCard';
import { buildApiUrl } from './shared/services/api.js';
import { formatMillimesToTnd } from './shared/utils/currency.js';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1528157777178-0062a444aeb8?w=800&q=80';

const resolveMediaUrl = (url) => {
  if (!url) return FALLBACK_IMAGE;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return buildApiUrl(url);
};

const Home = ({ onNavigate, isAuthenticated, onLogout }) => {
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  const handleCreateProject = () => {
    if (isAuthenticated) {
      onNavigate('startProject');
    } else {
      onNavigate('signIn', 'Vous devez etre connecte pour creer un projet.');
    }
  };

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const res = await fetch(buildApiUrl('/api/campaigns'));
        const data = await res.json();
        if (data.success) {
          setProjects(data.campaigns.slice(0, 3).map((campaign) => ({
            id: campaign.id,
            title: campaign.title,
            creator: `Par ${campaign.creator_name || 'Createur inconnu'}`,
            desc: campaign.description || '',
            image: resolveMediaUrl(campaign.image_url),
            funded: Number(campaign.funded_percent || 0),
            collected: formatMillimesToTnd(campaign.amount_raised || 0),
            daysLeft: '--',
            category: campaign.category || 'Projet',
          })));
        }
      } catch (err) {
        console.error('Failed to fetch homepage campaigns:', err);
      } finally {
        setLoadingProjects(false);
      }
    };

    fetchCampaigns();
  }, []);

  return (
    <div className="home-container">
      <div className="home-content-wrapper">
        <Navbar
          onNavigate={onNavigate}
          isAuthenticated={isAuthenticated}
          onLogout={onLogout}
          activeTab="home"
        />

        <section className="hero-section">
          <h1 className="hero-title">
            Financez les idees de <span>demain</span>,<br /> aujourd hui.
          </h1>
          <p className="hero-subtitle">
            Hive.tn est la premiere plateforme de financement participatif en Tunisie dediee aux projets innovants, solidaires et creatifs. Rejoignez la ruche.
          </p>
          <div className="hero-actions">
            <button className="hero-btn-primary" onClick={() => onNavigate('discover')}>Soutenir un projet</button>
            <button className="hero-btn-secondary" onClick={handleCreateProject}>Creer mon projet</button>
          </div>
        </section>

        <section className="projects-section">
          <h2 className="section-title">Campagnes publiees</h2>

          {loadingProjects ? (
            <div style={{ textAlign: 'center', color: '#a1a1aa', padding: '40px 0' }}>Chargement des campagnes...</div>
          ) : projects.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#a1a1aa', padding: '40px 0' }}>Aucune campagne active a afficher pour le moment.</div>
          ) : (
            <div className="projects-grid">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} onNavigate={onNavigate} />
              ))}
            </div>
          )}
        </section>

        <section className="how-it-works-section">
          <div className="hiw-container">
            <h2 className="section-title text-center">Comment ca marche ?</h2>
            <div className="hiw-grid">
              <div className="hiw-step">
                <div className="hiw-icon">??</div>
                <h3>1. Soutenez un projet</h3>
                <p>Decouvrez des idees tunisiennes innovantes et contribuez financierement a leur realisation en toute simplicite.</p>
              </div>
              <div className="hiw-step">
                <div className="hiw-icon">???</div>
                <h3>2. Soutien confirme sur Hive.tn</h3>
                <p>Chaque contribution est enregistree directement sur la plateforme pour soutenir rapidement les createurs et faire progresser la collecte.</p>
              </div>
              <div className="hiw-step">
                <div className="hiw-icon">?</div>
                <h3>3. Collecte mise a jour instantanement</h3>
                <p>Le montant atteint, le pourcentage de progression et les soutiens confirmes sont rafraichis aussitot sur la campagne.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Home;

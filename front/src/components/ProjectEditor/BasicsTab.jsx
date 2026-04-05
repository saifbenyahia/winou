import React, { useRef, useState } from 'react';

const API_URL = 'http://localhost:5000';

const BasicsTab = ({ draftProject, onSaveDraft, onNavigate }) => {
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveError, setSaveError] = useState('');

  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const launchDateInputRef = useRef(null);

  const campaignId = draftProject?.campaignId;
  const title = draftProject?.title || '';
  const subtitle = draftProject?.subtitle || '';
  const category = draftProject?.category || '';
  const goal = draftProject?.goal || '';
  const currentYear = new Date().getFullYear();
  const launchDay = draftProject?.launchDay || '';
  const launchMonth = draftProject?.launchMonth || '';
  const launchYear = draftProject?.launchYear || '';

  const sanitizeDatePart = (value, maxLength) => value.replace(/\D/g, '').slice(0, maxLength);

  const updateLaunchDateParts = (nextParts) => {
    if (!onSaveDraft) return;

    const nextDay = nextParts.launchDay ?? launchDay;
    const nextMonth = nextParts.launchMonth ?? launchMonth;
    const nextYear = nextParts.launchYear ?? launchYear;
    const hasFullDate = nextDay.length > 0 && nextMonth.length > 0 && nextYear.length === 4;

    onSaveDraft({
      ...nextParts,
      launchDate: hasFullDate
        ? `${nextYear.padStart(4, '0')}-${nextMonth.padStart(2, '0')}-${nextDay.padStart(2, '0')}`
        : '',
    });
  };

  const handleLaunchPartChange = (field, rawValue, maxValue, maxLength) => {
    const sanitized = sanitizeDatePart(rawValue, maxLength);
    if (!sanitized) {
      updateLaunchDateParts({ [field]: '' });
      return;
    }

    const numericValue = Number(sanitized);
    if (Number.isNaN(numericValue) || numericValue < 1 || numericValue > maxValue) {
      return;
    }

    updateLaunchDateParts({ [field]: sanitized });
  };

  const handleLaunchYearChange = (rawValue) => {
    const sanitized = sanitizeDatePart(rawValue, 4);
    if (!sanitized) {
      updateLaunchDateParts({ launchYear: '' });
      return;
    }

    const numericValue = Number(sanitized);
    if (Number.isNaN(numericValue)) return;

    if (sanitized.length === 4 && (numericValue < currentYear || numericValue > currentYear + 10)) {
      return;
    }

    updateLaunchDateParts({ launchYear: sanitized });
  };

  const openLaunchCalendar = () => {
    if (!launchDateInputRef.current) return;

    if (typeof launchDateInputRef.current.showPicker === 'function') {
      launchDateInputRef.current.showPicker();
    } else {
      launchDateInputRef.current.click();
    }
  };

  const handleLaunchDatePickerChange = (value) => {
    if (!value || !onSaveDraft) return;

    const [year, month, day] = value.split('-');
    onSaveDraft({
      launchDate: value,
      launchDay: day ? String(Number(day)) : '',
      launchMonth: month ? String(Number(month)) : '',
      launchYear: year || '',
    });
  };

  const handleMediaUpload = async (file, type) => {
    if (!campaignId) {
      setSaveError('Veuillez sauvegarder le projet au moins une fois avant d\'ajouter des médias.');
      return;
    }

    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);

    const isImage = type === 'image';
    if (isImage) setUploadingImage(true);
    else setUploadingVideo(true);
    setSaveError('');
    setSaveMsg('');

    try {
      const res = await fetch(`${API_URL}/api/campaigns/${campaignId}/media/${type}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      
      if (res.ok) {
        setSaveMsg(`${isImage ? 'Image' : 'Vidéo'} enregistrée avec succès ✓`);
        if (onSaveDraft) {
          onSaveDraft(isImage ? { image_url: data.fileUrl, video_url: '' } : { video_url: data.fileUrl, image_url: '' });
        }
        setTimeout(() => setSaveMsg(''), 3000);
      } else {
        const errorMsg = isImage ? "l'image" : "la vidéo";
        setSaveError(data.message || `Erreur lors de l'upload de ${errorMsg}.`);
      }
    } catch (err) {
      setSaveError('Erreur réseau lors de l\'upload.');
    } finally {
      if (isImage) setUploadingImage(false);
      else setUploadingVideo(false);
    }
  };

  const handleSave = async () => {
    if (!campaignId) {
      setSaveError('Aucun projet en cours. Veuillez d\'abord créer un projet.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setSaveError('Vous devez être connecté.');
      return;
    }

    setSaving(true);
    setSaveMsg('');
    setSaveError('');

    try {
      const body = {};
      if (title) body.title = title;
      if (subtitle) body.description = subtitle;
      if (category) body.category = category;
      if (goal) body.target_amount = parseInt(goal, 10) * 1000; // TND → millimes

      const res = await fetch(`${API_URL}/api/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setSaveError(data.message || 'Erreur lors de la sauvegarde.');
        return;
      }

      setSaveMsg('Modifications enregistrées ✓');
      if (onSaveDraft) {
        onSaveDraft({ title, subtitle, category, goal });
      }
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (err) {
      setSaveError('Impossible de contacter le serveur.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!campaignId) return;

    const token = localStorage.getItem('token');
    if (!token) {
      setSaveError('Vous devez être connecté.');
      return;
    }

    if (!window.confirm('Êtes-vous sûr de vouloir soumettre votre projet pour révision ?\n\nUne fois soumis, vous ne pourrez plus modifier le brouillon.')) {
      return;
    }

    setSaving(true);
    setSaveMsg('');
    setSaveError('');

    try {
      // Save first
      await handleSave();

      const res = await fetch(`${API_URL}/api/campaigns/${campaignId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setSaveError(data.message || 'Erreur lors de la soumission.');
        return;
      }

      setSaveMsg('Projet soumis pour révision ! Redirection...');
      setTimeout(() => {
        if (onNavigate) onNavigate('home');
      }, 2000);
    } catch (err) {
      setSaveError('Impossible de contacter le serveur.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div style={{ maxWidth: '1100px', margin: '0 auto 60px auto', textAlign: 'left' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '10px' }}>Commençons par les bases</h1>
        <p style={{ color: '#a1a1aa' }}>Facilitez la découverte de votre projet par notre communauté.</p>
      </div>

      {/* Feedback Messages */}
      {saveMsg && (
        <div style={{ maxWidth: '1100px', margin: '0 auto 20px', padding: '12px 16px', borderRadius: '10px', fontSize: '14px', backgroundColor: 'rgba(5, 206, 120, 0.12)', color: '#34d399', border: '1px solid rgba(5, 206, 120, 0.25)', textAlign: 'center' }}>
          {saveMsg}
        </div>
      )}
      {saveError && (
        <div style={{ maxWidth: '1100px', margin: '0 auto 20px', padding: '12px 16px', borderRadius: '10px', fontSize: '14px', backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.25)', textAlign: 'center' }}>
          {saveError}
        </div>
      )}

      {/* 1. Project Title & Subtitle */}
      <div className="pe-split-row">
        <div className="pe-split-left">
          <h2>Titre du projet</h2>
          <p style={{ marginBottom: '15px' }}>Rédigez un titre clair et concis ainsi qu'un sous-titre pour aider les internautes à comprendre rapidement votre projet. Les deux apparaîtront sur les pages de votre projet.</p>
          <p>Les contributeurs potentiels les verront aussi si votre projet figure sur la page de votre catégorie, dans les résultats de recherche ou dans nos emails.</p>
        </div>
        <div className="pe-split-right">
          <div style={{ marginBottom: '25px' }}>
            <label className="pe-label">Titre</label>
            <input
              type="text"
              className="pe-input"
              value={title}
              onChange={e => {
                const value = e.target.value;
                if (onSaveDraft) onSaveDraft({ title: value });
              }}
            />
            <div style={{ textAlign: 'right', fontSize: '12px', color: '#a1a1aa', marginTop: '5px' }}>
              {title.length}/60
            </div>
          </div>
          <div>
            <label className="pe-label">Sous-titre</label>
            <textarea
              className="pe-textarea pe-input"
              value={subtitle}
              onChange={e => {
                const value = e.target.value;
                if (onSaveDraft) onSaveDraft({ subtitle: value });
              }}
            />
            <div style={{ textAlign: 'right', fontSize: '12px', color: '#a1a1aa', marginTop: '5px' }}>
              {subtitle.length}/135
            </div>
          </div>
          <div className="pe-note">
            ⚡ Donnez aux contributeurs la meilleure première impression avec des titres accrocheurs.
          </div>
        </div>
      </div>

      {/* 2. Project Category */}
      <div className="pe-split-row">
        <div className="pe-split-left">
          <h2>Catégorie du projet</h2>
          <p style={{ marginBottom: '15px' }}>Choisissez une catégorie principale pour aider les contributeurs à trouver votre projet.</p>
        </div>
        <div className="pe-split-right">
          <div className="pe-form-row">
            <div className="pe-form-col">
              <label className="pe-label">Catégorie principale</label>
              <select
                className="pe-select"
                value={category}
                onChange={e => {
                  const value = e.target.value;
                  if (onSaveDraft) onSaveDraft({ category: value });
                }}
              >
                <option value="" disabled>Sélectionnez une catégorie</option>
                <option value="Arts & BD">Arts & BD</option>
                <option value="Artisanat">Artisanat</option>
                <option value="Cinéma & Vidéo">Cinéma & Vidéo</option>
                <option value="Projets Solidaires">Projets Solidaires</option>
                <option value="Tech & App">Tech & App</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Project Image */}
      <div className="pe-split-row">
        <div className="pe-split-left">
          <h2>Image du projet ou video principale</h2>
          <p style={{ marginBottom: '15px' }}>Ajoutez une image qui représente clairement votre projet. Choisissez-en une qui rend bien à différentes tailles.</p>
          <p>Votre image doit faire au moins 1024x576 pixels. Évitez les images contenant des bannières, des badges ou du texte.</p>
        </div>
        <div className="pe-split-right">
          <div className="pe-upload-box">
            <button className="pe-upload-btn" onClick={() => imageInputRef.current?.click()} disabled={uploadingImage}>
              {uploadingImage ? 'Importation...' : (draftProject?.video_url ? 'Remplacer la video par une image' : 'Importer une image')}
            </button>
            <input 
              type="file" 
              accept="image/*" 
              ref={imageInputRef} 
              style={{ display: 'none' }} 
              onChange={(e) => {
                if (e.target.files[0]) handleMediaUpload(e.target.files[0], 'image');
                e.target.value = '';
              }}
            />
            <div className="pe-upload-text">
              Formats acceptés : JPG, PNG, GIF, ou WEBP, ne dépassant pas 50 Mo.
              <br />
              Une campagne doit contenir une image ou une video principale avant publication.
              <br />
              Un seul media principal est autorise a la fois : image ou video.
              <br /><br />
              {draftProject?.image_url && (
                <div style={{ marginTop: '10px' }}>
                  <span style={{ color: '#0ce688' }}>✅ Image enregistrée</span>
                  <br/>
                  <img src={`${API_URL}${draftProject.image_url}`} alt="Preview" style={{ maxWidth: '100%', maxHeight: '150px', marginTop: '10px', borderRadius: '8px', objectFit: 'cover' }} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Project Video */}
      <div className="pe-split-row">
        <div className="pe-split-left">
          <h2>Video du projet</h2>
          <p style={{ marginBottom: '15px' }}>Ajoutez une vidéo qui décrit votre projet.</p>
          <p>Expliquez aux internautes pourquoi vous levez des fonds, comment vous comptez réaliser ce projet, qui vous êtes, et pourquoi cela vous tient à cœur.</p>
        </div>
        <div className="pe-split-right">
          <div className="pe-upload-box">
            <button className="pe-upload-btn" onClick={() => videoInputRef.current?.click()} disabled={uploadingVideo}>
              {uploadingVideo ? 'Importation en cours...' : (draftProject?.image_url ? "Remplacer l'image par une video" : 'Importer une vidéo')}
            </button>
            <input 
              type="file" 
              accept="video/*" 
              ref={videoInputRef} 
              style={{ display: 'none' }} 
              onChange={(e) => {
                if (e.target.files[0]) handleMediaUpload(e.target.files[0], 'video');
                e.target.value = '';
              }}
            />
            <div className="pe-upload-text">
              Formats acceptés : MOV, MPEG, AVI, MP4, 3GP, WMV ou FLV, ne dépassant pas 5120 Mo.
              <br />
              Cette video peut remplacer l'image principale si vous preferez presenter le projet en mouvement.
              <br /><br />
              {draftProject?.video_url && (
                <div style={{ marginTop: '10px' }}>
                  <span style={{ color: '#0ce688' }}>✅ Vidéo enregistrée</span>
                  <br/>
                  <video src={`${API_URL}${draftProject.video_url}`} controls style={{ maxWidth: '100%', maxHeight: '200px', marginTop: '10px', borderRadius: '8px', background: '#000' }} />
                </div>
              )}
            </div>
          </div>
          <div className="pe-note">
            ⚡ 80 % des projets réussis comportent une vidéo. Créez-en une excellente, quel que soit votre budget.
          </div>
        </div>
      </div>

      {/* 6. Target Launch Date */}
      <div className="pe-split-row">
        <div className="pe-split-left">
          <h2>Date de lancement cible (optionnel)</h2>
          <p style={{ marginBottom: '15px' }}>Nous vous fournirons des recommandations sur le moment idéal pour effectuer les démarches administratives qui peuvent prendre quelques jours.</p>
        </div>
        <div className="pe-split-right">
          <div className="pe-form-row" style={{ alignItems: 'flex-end' }}>
            <div className="pe-form-col">
              <label className="pe-label">Jour</label>
              <input
                type="number"
                className="pe-input"
                placeholder="JJ"
                min="1"
                max="31"
                inputMode="numeric"
                value={launchDay}
                onChange={e => handleLaunchPartChange('launchDay', e.target.value, 31, 2)}
              />
            </div>
            <div className="pe-form-col">
              <label className="pe-label">Mois</label>
              <input
                type="number"
                className="pe-input"
                placeholder="MM"
                min="1"
                max="12"
                inputMode="numeric"
                value={launchMonth}
                onChange={e => handleLaunchPartChange('launchMonth', e.target.value, 12, 2)}
              />
            </div>
            <div className="pe-form-col">
              <label className="pe-label">Année</label>
              <input
                type="number"
                className="pe-input"
                placeholder="AAAA"
                min={currentYear}
                max={currentYear + 10}
                inputMode="numeric"
                value={launchYear}
                onChange={e => handleLaunchYearChange(e.target.value)}
              />
            </div>
            <div className="pe-form-col" style={{ maxWidth: '64px', marginTop: '28px' }}>
              <button
                type="button"
                className="pe-upload-btn"
                onClick={openLaunchCalendar}
                aria-label="Ouvrir le calendrier"
                title="Ouvrir le calendrier"
                style={{ width: '100%', fontSize: '20px', padding: '8px 0', lineHeight: 1 }}
              >
                📅
              </button>
              <input
                ref={launchDateInputRef}
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={
                  draftProject?.launchDate ||
                  (launchDay && launchMonth && launchYear.length === 4
                    ? `${launchYear.padStart(4, '0')}-${launchMonth.padStart(2, '0')}-${launchDay.padStart(2, '0')}`
                    : '')
                }
                onChange={e => handleLaunchDatePickerChange(e.target.value)}
                style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 1, height: 1 }}
                tabIndex={-1}
                aria-hidden="true"
              />
            </div>
          </div>
          <div className="pe-note">
            Jour : 1-31, mois : 1-12, annee : {currentYear}-{currentYear + 10}.
          </div>
          <p style={{ fontSize: '14px', marginBottom: '10px', marginTop: '15px' }}>Nous vous recommanderons quand vous devrez :</p>
          <ul style={{ fontSize: '14px', color: '#a1a1aa', paddingLeft: '20px', marginBottom: '20px' }}>
            <li>Confirmer votre identité et fournir vos coordonnées bancaires</li>
            <li>Soumettre votre projet pour vérification</li>
          </ul>
          <div className="pe-note" style={{ color: '#a1a1aa' }}>
            🎯 Fixer une date cible ne lancera pas automatiquement votre projet.
          </div>
        </div>
      </div>

      {/* 5. Funding Goal */}
      <div className="pe-split-row">
        <div className="pe-split-left">
          <h2>Objectif de financement</h2>
          <p style={{ marginBottom: '15px' }}>Fixez un objectif réalisable qui couvre tout ce dont vous avez besoin pour mener à bien votre projet.</p>
          <p>Le financement suit le principe du tout ou rien. Si vous n'atteignez pas votre objectif, vous ne recevrez pas les fonds.</p>
        </div>
        <div className="pe-split-right">
          <label className="pe-label">Montant visé (TND)</label>
          <input
            type="number"
            className="pe-input"
            placeholder="Ex: 5000"
            value={goal}
            onChange={e => {
              const value = e.target.value;
              if (onSaveDraft) onSaveDraft({ goal: value });
            }}
          />
          <div className="pe-note">
            {goal && parseInt(goal) > 0 ? `= ${(parseInt(goal) * 1000).toLocaleString()} millimes` : ''}
          </div>
        </div>
      </div>

      {/* 6. Target Launch Date */}
      {/* 7. Campaign Duration */}
      <div className="pe-split-row">
        <div className="pe-split-left">
          <h2>Durée de la campagne</h2>
          <p>Fixez une limite de temps pour votre campagne. Vous ne pourrez plus la modifier une fois lancée.</p>
        </div>
        <div className="pe-split-right">
          <div className="pe-radio-group">
            <label className="pe-radio-item">
              <input type="radio" name="duration" value="15 jours" className="pe-radio-input" defaultChecked />
              <span style={{ fontSize: '15px' }}>15 jours</span>
            </label>
            <label className="pe-radio-item">
              <input type="radio" name="duration" value="1 mois" className="pe-radio-input" />
              <span style={{ fontSize: '15px' }}>1 mois</span>
            </label>
            <label className="pe-radio-item">
              <input type="radio" name="duration" value="2 mois" className="pe-radio-input" />
              <span style={{ fontSize: '15px' }}>2 mois</span>
            </label>
            <label className="pe-radio-item">
              <input type="radio" name="duration" value="6 mois" className="pe-radio-input" />
              <span style={{ fontSize: '15px' }}>6 mois</span>
            </label>
          </div>
          <div className="pe-note">
            ⚡ Les campagnes de 30 jours ou moins ont plus de chances d'aboutir.
          </div>
        </div>
      </div>


    </>
  );
};

export default BasicsTab;




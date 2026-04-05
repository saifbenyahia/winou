import React, { useState } from 'react';
import './Settings.css';
import Navbar from './Navbar';

const API_URL = 'http://localhost:5000';

const Settings = ({ onNavigate, isAuthenticated, onLogout }) => {
  const [activeTab, setActiveTab] = useState('account');
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Read user info from localStorage
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isGoogleOnlyUser = storedUser.auth_provider === 'google';

  // ── Account tab state ────────────────────────
  const [email, setEmail] = useState(storedUser.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // ── Profile tab state ────────────────────────
  const [name, setName] = useState(storedUser.name || '');
  const [bio, setBio] = useState(storedUser.bio || '');
  const [avatar, setAvatar] = useState(storedUser.avatar || '');

  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // ── Save account (email) — no password needed ─
  const handleSaveAccount = async () => {
    setError(''); setSaved('');
    if (!email.trim()) { setError('L\'email ne peut pas être vide.'); return; }

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/profile`, {
        method: 'PUT', headers,
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message); return; }

      localStorage.setItem('user', JSON.stringify(data.user));
      setSaved('Paramètres enregistrés avec succès !');
      setTimeout(() => window.location.reload(), 800);
    } catch { setError('Impossible de contacter le serveur.'); }
    finally { setSaving(false); }
  };

  // ── Change password (still requires current) ──
  const handleChangePassword = async () => {
    setError(''); setSaved('');
    if (!isGoogleOnlyUser && !currentPassword) { setError('Veuillez entrer votre mot de passe actuel.'); return; }
    if (!newPassword || !confirmPassword) { setError('Veuillez remplir les deux champs du nouveau mot de passe.'); return; }
    if (newPassword !== confirmPassword) { setError('Les deux mots de passe ne correspondent pas.'); return; }
    if (newPassword.length < 6) { setError('Le nouveau mot de passe doit contenir au moins 6 caractères.'); return; }

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/password`, {
        method: 'PUT', headers,
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message); return; }

      setSaved('Mot de passe modifié avec succès !');
      setNewPassword(''); setConfirmPassword(''); setCurrentPassword('');
      setIsChangingPassword(false);
      setTimeout(() => setSaved(''), 4000);
    } catch { setError('Impossible de contacter le serveur.'); }
    finally { setSaving(false); }
  };

  // ── Avatar Upload Handler ────────────────────
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file size (e.g. 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("L'image est trop volumineuse (max 5MB).");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setAvatar(event.target.result); // Base64 string
    };
    reader.readAsDataURL(file);
  };

  // ── Save profile (name + bio) — no password ──
  const handleSaveProfile = async () => {
    setError(''); setSaved('');
    if (!name.trim()) { setError('Le nom ne peut pas être vide.'); return; }

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/profile`, {
        method: 'PUT', headers,
        body: JSON.stringify({ name: name.trim(), bio, avatar }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message); return; }

      localStorage.setItem('user', JSON.stringify(data.user));
      setSaved('Profil mis à jour avec succès !');
      setTimeout(() => window.location.reload(), 800);
    } catch { setError('Impossible de contacter le serveur.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="settings-page-wrapper">
      <Navbar onNavigate={onNavigate} isAuthenticated={isAuthenticated} onLogout={onLogout} activeTab="settings" />

      <div className="settings-main">
        <h1 className="settings-page-title">Paramètres</h1>
        
        <div className="settings-tabs" role="tablist" aria-label="Paramètres">
          <span className={`settings-tab ${activeTab === 'account' ? 'active' : ''}`}
            onClick={() => { setActiveTab('account'); setError(''); setSaved(''); }}
            role="tab" aria-selected={activeTab === 'account'} tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setActiveTab('account')}>
            Compte
          </span>
          <span className={`settings-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => { setActiveTab('profile'); setError(''); setSaved(''); }}
            role="tab" aria-selected={activeTab === 'profile'} tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setActiveTab('profile')}>
            Modifier le profil
          </span>
        </div>

        {/* Feedback */}
        {saved && (
          <div style={{ padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', backgroundColor: 'rgba(5, 206, 120, 0.12)', color: '#34d399', border: '1px solid rgba(5, 206, 120, 0.25)', fontSize: '14px', fontWeight: '500' }}>
            ✓ {saved}
          </div>
        )}
        {error && (
          <div style={{ padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.25)', fontSize: '14px', fontWeight: '500' }}>
            {error}
          </div>
        )}

        {/* ── ONGLET: COMPTE ── */}
        {activeTab === 'account' && (
          <div className="settings-grid">
            <div className="settings-form-left">
              <div className="settings-form-group">
                <label className="settings-label">Email</label>
                <input type="text" className="settings-input" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>

              <div className="settings-form-group">
                <label className="settings-label">Mot de passe</label>
                {!isChangingPassword ? (
                  <button className="settings-btn-outline" onClick={() => setIsChangingPassword(true)}>
                    {isGoogleOnlyUser ? 'Ajouter un mot de passe' : 'Changer le mot de passe'}
                  </button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
                    {!isGoogleOnlyUser && (
                      <input type="password" className="settings-input" placeholder="Mot de passe actuel" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                    )}
                    {isGoogleOnlyUser && (
                      <div className="settings-help-text" style={{ marginTop: 0 }}>
                        Votre compte a ete cree avec Google. Vous pouvez definir un mot de passe local pour vous connecter aussi par email.
                      </div>
                    )}
                    <input type="password" className="settings-input" placeholder="Nouveau mot de passe" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                    <input type="password" className="settings-input" placeholder="Confirmer le nouveau mot de passe" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button className="nav-btn-solid" style={{ padding: '8px 16px', fontSize: '13px' }} onClick={handleChangePassword} disabled={saving}>
                        {saving ? 'En cours...' : 'Valider'}
                      </button>
                      <button className="settings-btn-outline" style={{ padding: '8px 16px', fontSize: '13px' }}
                        onClick={() => { setIsChangingPassword(false); setNewPassword(''); setConfirmPassword(''); setCurrentPassword(''); }}>
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="settings-footer" style={{ borderTop: 'none', paddingTop: 0, marginTop: '24px' }}>
                <button className="nav-btn-solid" onClick={handleSaveAccount} disabled={saving}>
                  {saving ? 'Sauvegarde...' : 'Enregistrer'}
                </button>
              </div>
            </div>

            <div className="settings-form-right">
              <div className="settings-sidebar-block">
                <div className="settings-sidebar-title">Confidentialité</div>
                <span className="settings-sidebar-link">Se désinscrire de Following</span>
                <span className="settings-sidebar-link">Désactiver les recommandations</span>
                <span className="settings-sidebar-link">Demander mes données personnelles</span>
              </div>
              <div className="settings-sidebar-block">
                <div className="settings-sidebar-title">Sécurité</div>
                <div className="settings-sidebar-text">
                  <span className="settings-sidebar-link" style={{margin:0}}>Configurer l'A2F (2FA)</span>
                  <span className="badge-off">Off</span>
                </div>
                <span className="settings-sidebar-link">Déconnecter tous les autres appareils</span>
              </div>
              <div className="settings-sidebar-block">
                <div className="settings-sidebar-title">Supprimer le compte</div>
                <span className="settings-sidebar-link text-danger">Supprimer mon compte Hive.tn</span>
              </div>
            </div>
          </div>
        )}

        {/* ── ONGLET: MODIFIER LE PROFIL ── */}
        {activeTab === 'profile' && (
          <div className="settings-grid">
            <div className="settings-form-left">

              <div className="settings-form-group">
                <label className="settings-label">Nom</label>
                <input type="text" className="settings-input" value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div className="settings-form-group">
                <label className="settings-label">Avatar</label>
                <label className="avatar-upload-box" style={{ 
                    cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    backgroundImage: avatar ? `url(${avatar})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', color: avatar ? 'transparent' : 'inherit'
                  }}>
                  {avatar ? '' : 'Choisissez une image depuis votre ordinateur'}
                  <input type="file" accept="image/jpeg, image/png, image/gif" style={{ display: 'none' }} onChange={handleAvatarChange} />
                </label>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                  <div className="settings-help-text" style={{ marginTop: 0 }}>JPEG, PNG ou GIF • Limite de fichier 5MB</div>
                  {avatar && <span style={{ color: '#ef4444', fontSize: '13px', cursor: 'pointer' }} onClick={() => setAvatar('')}>Supprimer la photo</span>}
                </div>
              </div>

              <div className="settings-form-group">
                <label className="settings-label">Biographie</label>
                <textarea className="settings-textarea" value={bio} onChange={(e) => setBio(e.target.value)}
                  placeholder="Décrivez-vous en quelques mots..."></textarea>
                <div className="settings-help-text">Nous suggérons une courte bio. Si elle fait moins de 300 caractères, elle sera du plus bel effet sur votre profil.</div>
              </div>

              <div className="settings-form-group">
                <label className="settings-label">Confidentialité</label>
                <div className="checkbox-container">
                  <input type="checkbox" id="privacy-check" defaultChecked />
                  <label htmlFor="privacy-check">
                    Afficher uniquement mon nom et avatar
                    <span className="sub-label">Décochez cette case pour afficher publiquement votre biographie.</span>
                  </label>
                </div>
              </div>

              <div className="settings-footer">
                <button className="nav-btn-solid" onClick={handleSaveProfile} disabled={saving}>
                  {saving ? 'Sauvegarde...' : 'Sauvegarder les paramètres'}
                </button>
                <span className="settings-sidebar-link" style={{ margin: 0, marginLeft: 'auto' }} onClick={() => onNavigate('profile')}>Voir le profil</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Settings;

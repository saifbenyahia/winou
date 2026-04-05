import React, { useState } from 'react';
import './SignIn.css';
import GoogleAuthButton from './components/Auth/GoogleAuthButton';

const API_URL = 'http://localhost:5000';

const SignIn = ({ onSwitch, onForgotPassword, onHome, onLoginSuccess, message }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // ── Client-side validation ──────────────────
    if (!formData.email || !formData.password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    // ── API call ────────────────────────────────
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Email ou mot de passe incorrect.');
        return;
      }

      // ── Success: store token & redirect ───────
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Call the parent login handler
      if (onLoginSuccess) {
        onLoginSuccess(data.token, data.user);
      } else if (onHome) {
        onHome();
      }
    } catch (err) {
      setError('Impossible de contacter le serveur. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-logo" style={{ cursor: 'pointer' }} onClick={onHome}>Hive.tn</h1>
          {message && (
            <div className="auth-message auth-error">
              ⚠️ {message}
            </div>
          )}
          <h2 className="auth-title">Bon retour !</h2>
          <p className="auth-subtitle">Connectez-vous pour retrouver vos projets et vos dons.</p>
        </div>

        {error && <div className="auth-message auth-error">{error}</div>}

        <GoogleAuthButton disabled={loading} />
        <div className="auth-divider">ou</div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <input type="text" id="email" required placeholder=" " value={formData.email} onChange={handleChange} />
            <label htmlFor="email">Adresse Email</label>
          </div>
          <div className="input-group">
            <input type={showPassword ? "text" : "password"} id="password" required placeholder=" " value={formData.password} onChange={handleChange} />
            <label htmlFor="password">Mot de passe</label>
            <button 
              type="button" 
              className="password-toggle-btn" 
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"></path></svg>
              )}
            </button>
          </div>
          <div className="auth-options">
            <label className="remember-me">
              <input type="checkbox" />
              <span className="checkbox-custom"></span>
              <span className="text-small">Rester connecté</span>
            </label>
            <a href="#" onClick={(e) => { e.preventDefault(); onForgotPassword(); }} className="auth-link text-small">Mot de passe oublié ?</a>
          </div>
          <button type="submit" className="auth-button" disabled={loading}>
            <span>{loading ? 'Connexion en cours...' : 'Se connecter'}</span>
            {!loading && (
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="btn-icon"><path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            )}
          </button>
        </form>
        <div className="auth-footer">
          Nouveau sur Hive.tn ? <a href="#" onClick={(e) => { e.preventDefault(); onSwitch(); }} className="auth-link">Inscrivez-vous</a>
        </div>
      </div>
    </div>
  );
};

export default SignIn;

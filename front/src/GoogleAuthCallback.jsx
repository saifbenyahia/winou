import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SignIn.css';

const API_URL = 'http://localhost:5000';

const decodeBase64Url = (value) => {
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(window.atob(padded));
  } catch {
    return null;
  }
};

const GoogleAuthCallback = ({ onAuthSuccess }) => {
  const navigate = useNavigate();
  const [message, setMessage] = useState('Connexion Google en cours...');
  const [error, setError] = useState('');

  useEffect(() => {
    const finalizeGoogleAuth = async () => {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const token = hashParams.get('token');
      const encodedUser = hashParams.get('user');
      const oauthError = hashParams.get('error');

      if (oauthError) {
        setError(oauthError);
        setMessage('');
        return;
      }

      if (!token) {
        setError('La reponse Google est incomplete. Merci de reessayer.');
        setMessage('');
        return;
      }

      let user = encodedUser ? decodeBase64Url(encodedUser) : null;

      if (!user) {
        try {
          const response = await fetch(`${API_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await response.json();
          if (!response.ok || !data.success) {
            throw new Error(data.message || 'Impossible de recuperer votre session.');
          }
          user = data.user;
        } catch (fetchError) {
          setError(fetchError.message || 'Connexion Google reussie, mais la session n a pas pu etre finalisee.');
          setMessage('');
          return;
        }
      }

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      if (onAuthSuccess) {
        onAuthSuccess(token, user);
      } else {
        navigate(user?.role === 'ADMIN' ? '/admin' : '/');
      }
    };

    finalizeGoogleAuth();
  }, [navigate, onAuthSuccess]);

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-logo">Hive.tn</h1>
          <h2 className="auth-title">Connexion Google</h2>
          <p className="auth-subtitle">
            {message || 'La connexion Google n a pas pu etre finalisee.'}
          </p>
        </div>

        {error ? (
          <>
            <div className="auth-message auth-error">{error}</div>
            <button className="auth-button" type="button" onClick={() => navigate('/login')}>
              Retour a la connexion
            </button>
          </>
        ) : (
          <div className="auth-message auth-success">
            Finalisation de votre session en cours...
          </div>
        )}
      </div>
    </div>
  );
};

export default GoogleAuthCallback;

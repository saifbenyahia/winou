import React from 'react';
import './GoogleAuthButton.css';

const API_URL = 'http://localhost:5000';

const GoogleAuthButton = ({ label = 'Continuer avec Google', disabled = false }) => {
  const handleGoogleAuth = () => {
    if (disabled) return;
    window.location.assign(`${API_URL}/api/auth/google`);
  };

  return (
    <button
      type="button"
      className="google-auth-btn"
      onClick={handleGoogleAuth}
      disabled={disabled}
    >
      <span className="google-auth-btn__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.3 14.7 2.4 12 2.4 6.8 2.4 2.6 6.6 2.6 11.8S6.8 21.2 12 21.2c6.9 0 9.1-4.8 9.1-7.3 0-.5 0-.9-.1-1.3H12z" />
          <path fill="#34A853" d="M2.6 11.8c0 1.7.4 3.2 1.2 4.6l3.5-2.7c-.2-.6-.4-1.2-.4-1.9s.1-1.3.4-1.9L3.8 7.2c-.8 1.4-1.2 2.9-1.2 4.6z" />
          <path fill="#FBBC05" d="M12 21.2c2.7 0 4.9-.9 6.6-2.4l-3.2-2.5c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.7-5.6-4.1l-3.6 2.8c1.7 3.2 5 5.3 8.8 5.3z" />
          <path fill="#4285F4" d="M18.6 18.8c1.9-1.8 2.5-4.5 2.5-6.9 0-.5 0-.9-.1-1.3H12v3.9h5.5c-.3 1.2-1 2.3-1.9 3.1l3 1.2z" />
        </svg>
      </span>
      <span>{label}</span>
    </button>
  );
};

export default GoogleAuthButton;

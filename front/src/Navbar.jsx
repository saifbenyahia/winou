import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Home.css';

const API_URL = 'http://localhost:5000';

const Navbar = ({ onNavigate, isAuthenticated, onLogout, activeTab }) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const menuRef = useRef(null);
  const notificationRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userName = storedUser.name || 'Utilisateur';
  const userEmail = storedUser.email || '';
  const userInitials = userName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setShowProfileMenu(false);
    setShowNotifications(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    let isMounted = true;

    const fetchNotifications = async () => {
      try {
        setLoadingNotifications(true);
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok || !data.success || !isMounted) return;
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      } catch (error) {
        console.error('Notifications load error:', error);
      } finally {
        if (isMounted) {
          setLoadingNotifications(false);
        }
      }
    };

    fetchNotifications();
    const interval = window.setInterval(fetchNotifications, 30000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [isAuthenticated, location.pathname]);

  const handleCreateProject = () => {
    if (isAuthenticated) {
      onNavigate('startProject');
    } else {
      onNavigate('signIn', 'Vous devez etre connecte pour creer un projet.');
    }
    setIsMobileMenuOpen(false);
  };

  const handleMenuNavigate = (view) => {
    setIsMobileMenuOpen(false);
    onNavigate(view);
  };

  const formatNotificationTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleMarkAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/notifications/read-all`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok || !data.success) return;
      setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Mark all notifications read error:', error);
    }
  };

  const handleOpenNotificationLink = async (notification) => {
    try {
      if (!notification.is_read) {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/notifications/${notification.id}/read`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (response.ok && data.success) {
          setNotifications((prev) => prev.map((item) => (
            item.id === notification.id ? { ...item, is_read: true } : item
          )));
          setUnreadCount(data.unreadCount ?? Math.max(0, unreadCount - 1));
        }
      }
    } catch (error) {
      console.error('Notification read error:', error);
    }

    setShowNotifications(false);
    setIsMobileMenuOpen(false);

    if (notification.link) {
      navigate(notification.link);
    }
  };

  return (
    <nav className={`navbar ${isMobileMenuOpen ? 'nav-open' : ''}`} style={{ zIndex: 110, position: 'relative' }}>
      <div className="nav-left">
        <h1 className="nav-logo" onClick={() => handleMenuNavigate('home')}>Hive.tn</h1>
      </div>

      <button
        type="button"
        className={`nav-menu-toggle ${isMobileMenuOpen ? 'active' : ''}`}
        aria-label={isMobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
        aria-expanded={isMobileMenuOpen}
        onClick={() => setIsMobileMenuOpen((prev) => !prev)}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <div className={`nav-mobile-panel ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="nav-center">
          <span className={`nav-link ${activeTab === 'discover' ? 'active' : ''}`} style={{ cursor: 'pointer' }} onClick={() => handleMenuNavigate('discover')}>Decouvrir</span>
          <span className={`nav-link ${activeTab === 'home' ? 'active' : ''}`} style={{ cursor: 'pointer' }} onClick={() => handleMenuNavigate('home')}>Accueil</span>
          <span className={`nav-link ${activeTab === 'startProject' ? 'active' : ''}`} style={{ cursor: 'pointer' }} onClick={handleCreateProject}>Lancer un projet</span>
        </div>

        <div className="nav-right">
          {!isAuthenticated ? (
            <>
              <span className="nav-link" style={{ cursor: 'pointer' }} onClick={() => handleMenuNavigate('signIn')}>Connexion</span>
              <button className="nav-btn-solid" onClick={() => handleMenuNavigate('signUp')}>S'inscrire</button>
            </>
          ) : (
            <div className="nav-user-actions">
              <div className="notification-container" ref={notificationRef}>
                <button
                  type="button"
                  className="notification-btn"
                  aria-label="Notifications"
                  onClick={() => {
                    setShowNotifications((prev) => !prev);
                    setShowProfileMenu(false);
                  }}
                >
                  <span className="notification-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5"></path><path d="M10 21a2.3 2.3 0 0 0 4 0"></path></svg></span>
                  {unreadCount > 0 && <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                </button>

                {showNotifications && (
                  <div className="notification-dropdown">
                    <div className="notification-dropdown-header">
                      <strong>Notifications</strong>
                      {unreadCount > 0 && (
                        <button type="button" className="notification-mark-all" onClick={handleMarkAllAsRead}>
                          Tout marquer comme lu
                        </button>
                      )}
                    </div>
                    <div className="dropdown-divider"></div>

                    {loadingNotifications ? (
                      <div className="notification-empty">Chargement...</div>
                    ) : notifications.length === 0 ? (
                      <div className="notification-empty">Aucune notification pour le moment.</div>
                    ) : (
                      <div className="notification-list">
                        {notifications.map((notification) => (
                          <button
                            key={notification.id}
                            type="button"
                            className={`notification-item ${notification.is_read ? 'is-read' : 'is-unread'}`}
                            onClick={() => handleOpenNotificationLink(notification)}
                          >
                            <div className="notification-item-top">
                              <span className="notification-item-title">{notification.title}</span>
                              <span className="notification-item-time">{formatNotificationTime(notification.created_at)}</span>
                            </div>
                            <span className="notification-item-message">{notification.message}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="user-profile-container" ref={menuRef}>
                <div
                  className="user-avatar"
                  onClick={() => {
                    setShowProfileMenu((prev) => !prev);
                    setShowNotifications(false);
                  }}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: storedUser.avatar ? 'none' : 'linear-gradient(135deg, #0ce688, #0ab56b)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: '800',
                    color: '#0b0f19',
                    cursor: 'pointer',
                    overflow: 'hidden',
                  }}
                >
                  {storedUser.avatar ? (
                    <img src={storedUser.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    userInitials
                  )}
                </div>

                {showProfileMenu && (
                  <div className="profile-dropdown">
                    <div className="dropdown-header">
                      <strong>{userName}</strong>
                      <span className="text-small" style={{ color: '#a1a1aa', fontSize: '13px' }}>{userEmail}</span>
                    </div>
                    <div className="dropdown-divider"></div>
                    <div className="dropdown-item" onClick={() => handleMenuNavigate('profile')}>Profil</div>
                    <div className="dropdown-item" onClick={() => handleMenuNavigate('settings')}>Parametres</div>
                    <div className="dropdown-item" onClick={() => handleMenuNavigate('saved')}>Enregistrements</div>
                    <div className="dropdown-divider"></div>
                    <div
                      className="dropdown-item text-danger"
                      onClick={() => {
                        setShowProfileMenu(false);
                        setIsMobileMenuOpen(false);
                        if (onLogout) onLogout();
                      }}
                    >
                      Deconnexion
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;


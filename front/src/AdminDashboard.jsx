import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './AdminDashboard.css';
import AdminSupportWorkspace from './components/Support/AdminSupportWorkspace';
import { buildApiUrl } from './lib/api';

const emptyEditCampaignModal = () => ({
  isOpen: false,
  campaignId: null,
  title: '',
  description: '',
  category: '',
  targetAmount: '',
  imageUrl: '',
  imagePreview: '',
  imageFile: null,
  videoUrl: '',
  videoPreview: '',
  videoFile: null,
});
const emptyCommentsModal = () => ({
  isOpen: false,
  campaign: null,
  comments: [],
  loading: false,
  error: '',
});

const resolveMediaUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return buildApiUrl(url);
};

/**
 * AdminDashboard — Connected to real backend API
 * All mock data removed. KPIs, pending campaigns, and users
 * are fetched from /api/admin/* endpoints.
 */
const AdminDashboard = ({ onNavigate }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('analytics');
  const [rejectModal, setRejectModal] = useState({ isOpen: false, campaignId: null, reason: '' });
  const [viewModal, setViewModal] = useState({ isOpen: false, campaign: null });
  const [editCampaignModal, setEditCampaignModal] = useState(emptyEditCampaignModal);
  const [commentsModal, setCommentsModal] = useState(emptyCommentsModal);
  const [deleteCommentModal, setDeleteCommentModal] = useState({ isOpen: false, comment: null });
  const [deleteCampaignModal, setDeleteCampaignModal] = useState({ isOpen: false, campaign: null });
  const [deleteUserModal, setDeleteUserModal] = useState({ isOpen: false, user: null });
  const [feedbackModal, setFeedbackModal] = useState({ isOpen: false, title: '', message: '', variant: 'success' });
  const [roleConfirmModal, setRoleConfirmModal] = useState({ isOpen: false, user: null, newRole: 'USER' });
  const [editUserModal, setEditUserModal] = useState({
    isOpen: false,
    userId: null,
    name: '',
    email: '',
    role: 'USER',
    bio: '',
    avatar: '',
  });

  // ── Live State (fetched from API) ────────────
  const [stats, setStats] = useState(null);
  const [allCampaigns, setAllCampaigns] = useState([]);
  const [pendingCampaigns, setPendingCampaigns] = useState([]);
  const [pledges, setPledges] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const token = localStorage.getItem('token');
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  const openFeedbackModal = (title, message, variant = 'success') => {
    setFeedbackModal({ isOpen: true, title, message, variant });
  };

  // ── Fetch KPI stats ──────────────────────────
  const fetchStats = async () => {
    try {
      const res = await fetch(buildApiUrl('/api/admin/stats'), { headers });
      const data = await res.json();
      if (data.success) setStats(data.stats);
      else setError(data.message);
    } catch { setError('Impossible de charger les statistiques.'); }
  };

  // ── Fetch pending campaigns ──────────────────
  const fetchPending = async () => {
    try {
      const res = await fetch(buildApiUrl('/api/admin/campaigns/pending'), { headers });
      const data = await res.json();
      if (data.success) setPendingCampaigns(data.campaigns);
    } catch { /* silent */ }
  };

  const fetchAllCampaigns = async () => {
    try {
      const res = await fetch(buildApiUrl('/api/admin/campaigns'), { headers });
      const data = await res.json();
      if (data.success) setAllCampaigns(data.campaigns);
    } catch { /* silent */ }
  };

  const fetchPledges = async () => {
    try {
      const res = await fetch(buildApiUrl('/api/admin/pledges'), { headers });
      const data = await res.json();
      if (data.success) setPledges(data.pledges);
    } catch { /* silent */ }
  };

  // ── Fetch users ──────────────────────────────
  const fetchUsers = async () => {
    try {
      const res = await fetch(buildApiUrl('/api/admin/users'), { headers });
      const data = await res.json();
      if (data.success) setUsers(data.users);
    } catch { /* silent */ }
  };

  const handleOpenCampaignComments = async (campaign) => {
    setCommentsModal({
      isOpen: true,
      campaign,
      comments: [],
      loading: true,
      error: '',
    });

    try {
      const res = await fetch(buildApiUrl(`/api/admin/campaigns/${campaign.id}/comments`), { headers });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setCommentsModal({
          isOpen: true,
          campaign,
          comments: [],
          loading: false,
          error: data.message || 'Impossible de charger les commentaires.',
        });
        return;
      }

      setCommentsModal({
        isOpen: true,
        campaign: data.campaign || campaign,
        comments: data.comments || [],
        loading: false,
        error: '',
      });
    } catch {
      setCommentsModal({
        isOpen: true,
        campaign,
        comments: [],
        loading: false,
        error: 'Impossible de charger les commentaires.',
      });
    }
  };

  const handleDeleteAdminComment = async (comment) => {
    setDeleteCommentModal({ isOpen: true, comment });
  };

  const confirmDeleteAdminComment = async () => {
    if (!deleteCommentModal.comment) return;

    try {
      const res = await fetch(buildApiUrl(`/api/admin/comments/${deleteCommentModal.comment.id}`), {
        method: 'DELETE',
        headers,
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        openFeedbackModal('Suppression impossible', data.message || 'Le commentaire n a pas pu etre supprime.', 'error');
        return;
      }

      setCommentsModal((prev) => ({
        ...prev,
        comments: prev.comments.map((item) => (
          item.id === deleteCommentModal.comment.id
            ? { ...item, is_deleted: true }
            : item
        )),
      }));
    } catch {
      openFeedbackModal('Erreur reseau', 'Impossible de supprimer ce commentaire pour le moment.', 'error');
    } finally {
      setDeleteCommentModal({ isOpen: false, comment: null });
    }
  };

  // ── Initial load ─────────────────────────────
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchPending(), fetchAllCampaigns(), fetchPledges(), fetchUsers()]);
      setLoading(false);
    };
    loadAll();
  }, []);

  useEffect(() => {
    if (location.pathname.startsWith('/admin/support')) {
      setActiveTab('support');
    } else if (activeTab === 'support') {
      setActiveTab('analytics');
    }
  }, [activeTab, location.pathname]);

  const handleAdminTabChange = (tab) => {
    setActiveTab(tab);

    if (tab === 'support') {
      navigate('/admin/support');
      return;
    }

    if (location.pathname.startsWith('/admin/support')) {
      navigate('/admin');
    }
  };

  // ── Approve campaign ─────────────────────────
  const handleApprove = async (id) => {
    try {
      const res = await fetch(buildApiUrl(`/api/admin/campaigns/${id}/approve`), {
        method: 'POST', headers,
      });
      const data = await res.json();
      if (data.success) {
        setPendingCampaigns(prev => prev.filter(c => c.id !== id));
        fetchStats();
        fetchAllCampaigns();
        setFeedbackModal({
          isOpen: true,
          title: 'Campagne approuvee',
          message: data.message || 'La campagne est maintenant active sur la plateforme.',
          variant: 'success',
        });
      } else {
        openFeedbackModal('Approbation impossible', data.message || 'La campagne n a pas pu etre approuvee.', 'error');
      }
    } catch {
      openFeedbackModal('Erreur reseau', 'Impossible de contacter le serveur pour approuver la campagne.', 'error');
    }
  };

  // ── Reject campaign ──────────────────────────
  const handleRejectClick = (id) => {
    setRejectModal({ isOpen: true, campaignId: id, reason: '' });
  };

  const handleOpenEditCampaign = (campaign) => {
    setEditCampaignModal({
      ...emptyEditCampaignModal(),
      isOpen: true,
      campaignId: campaign.id,
      title: campaign.title || '',
      description: campaign.description || '',
      category: campaign.category || '',
      targetAmount: campaign.target_amount ? String(campaign.target_amount / 1000) : '',
      imageUrl: campaign.image_url || '',
      imagePreview: resolveMediaUrl(campaign.image_url),
      videoUrl: campaign.video_url || '',
      videoPreview: resolveMediaUrl(campaign.video_url),
    });
  };

  const handleEditCampaignImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      openFeedbackModal('Image trop volumineuse', "Choisissez une image de 5 Mo maximum.", 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setEditCampaignModal(prev => ({
        ...prev,
        imageFile: file,
        imagePreview: event.target?.result || '',
        videoUrl: '',
        videoPreview: '',
        videoFile: null,
      }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleEditCampaignVideoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 200 * 1024 * 1024) {
      openFeedbackModal('Video trop volumineuse', 'Choisissez une video de 200 Mo maximum.', 'warning');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setEditCampaignModal(prev => ({
      ...prev,
      videoFile: file,
      videoPreview: objectUrl,
      imageUrl: '',
      imagePreview: '',
      imageFile: null,
    }));
    e.target.value = '';
  };

  const handleSaveEditedCampaign = async () => {
    if (!editCampaignModal.title.trim() || !editCampaignModal.category.trim() || !editCampaignModal.targetAmount) {
      openFeedbackModal('Champs obligatoires', 'Titre, categorie et objectif sont obligatoires.', 'warning');
      return;
    }

    const targetAmount = Number(editCampaignModal.targetAmount);
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      openFeedbackModal('Objectif invalide', "L'objectif doit etre un montant positif.", 'warning');
      return;
    }

    try {
      let nextImageUrl = editCampaignModal.imageUrl || '';
      let nextVideoUrl = editCampaignModal.videoUrl || '';

      if (editCampaignModal.imageFile) {
        nextVideoUrl = '';
        const formData = new FormData();
        formData.append('file', editCampaignModal.imageFile);

        const uploadRes = await fetch(buildApiUrl(`/api/admin/campaigns/${editCampaignModal.campaignId}/image`), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });
        const uploadData = await uploadRes.json();

        if (!uploadData.success) {
          openFeedbackModal('Upload image impossible', uploadData.message || "Erreur lors de l'upload de l'image.", 'error');
          return;
        }

        nextImageUrl = uploadData.fileUrl || nextImageUrl;
      }

      if (editCampaignModal.videoFile) {
        nextImageUrl = '';
        const formData = new FormData();
        formData.append('file', editCampaignModal.videoFile);

        const uploadRes = await fetch(buildApiUrl(`/api/admin/campaigns/${editCampaignModal.campaignId}/video`), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });
        const uploadData = await uploadRes.json();

        if (!uploadData.success) {
          openFeedbackModal('Upload video impossible', uploadData.message || "Erreur lors de l'upload de la video.", 'error');
          return;
        }

        nextVideoUrl = uploadData.fileUrl || nextVideoUrl;
      }

      const res = await fetch(buildApiUrl(`/api/admin/campaigns/${editCampaignModal.campaignId}`), {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          title: editCampaignModal.title.trim(),
          description: editCampaignModal.description.trim(),
          category: editCampaignModal.category.trim(),
          target_amount: Math.round(targetAmount * 1000),
          image_url: nextImageUrl,
          video_url: nextVideoUrl,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setEditCampaignModal(emptyEditCampaignModal());
        fetchAllCampaigns();
        setFeedbackModal({
          isOpen: true,
          title: 'Campagne mise a jour',
          message: data.message || 'Les informations de la campagne ont ete enregistrees avec succes.',
          variant: 'success',
        });
      } else {
        openFeedbackModal('Mise a jour impossible', data.message || 'Erreur de mise a jour.', 'error');
      }
    } catch {
      openFeedbackModal('Erreur reseau', 'Impossible d enregistrer les modifications pour le moment.', 'error');
    }
  };

  const confirmRejection = async () => {
    if (!rejectModal.reason.trim()) {
      openFeedbackModal('Motif requis', 'Ajoutez un motif clair avant de refuser cette campagne.', 'warning');
      return;
    }
    try {
      const res = await fetch(buildApiUrl(`/api/admin/campaigns/${rejectModal.campaignId}/reject`), {
        method: 'POST', headers,
        body: JSON.stringify({ reason: rejectModal.reason }),
      });
      const data = await res.json();
      if (data.success) {
        setPendingCampaigns(prev => prev.filter(c => c.id !== rejectModal.campaignId));
        fetchStats();
        fetchAllCampaigns();
      }
      openFeedbackModal(
        data.success ? 'Campagne refusee' : 'Refus impossible',
        data.message || 'Campagne refusee.',
        data.success ? 'success' : 'error'
      );
    } catch {
      openFeedbackModal('Erreur reseau', 'Impossible de finaliser le refus de la campagne.', 'error');
    }
    setRejectModal({ isOpen: false, campaignId: null, reason: '' });
  };

  // ── Delete user ──────────────────────────────
  const handleDeleteCampaign = async (campaign) => {
    setDeleteCampaignModal({ isOpen: true, campaign });
  };

  const confirmDeleteCampaign = async () => {
    if (!deleteCampaignModal.campaign) return;
    const campaign = deleteCampaignModal.campaign;
    try {
      const res = await fetch(buildApiUrl(`/api/admin/campaigns/${campaign.id}`), {
        method: 'DELETE', headers,
      });
      const data = await res.json();
      if (data.success) {
        setAllCampaigns(prev => prev.filter(item => item.id !== campaign.id));
        setPendingCampaigns(prev => prev.filter(item => item.id !== campaign.id));
        fetchStats();
        fetchPending();
        fetchAllCampaigns();
      }
      openFeedbackModal(
        data.success ? 'Campagne supprimee' : 'Suppression impossible',
        data.message || 'Campagne supprimee.',
        data.success ? 'success' : 'error'
      );
    } catch {
      openFeedbackModal('Erreur reseau', 'Impossible de supprimer cette campagne pour le moment.', 'error');
    } finally {
      setDeleteCampaignModal({ isOpen: false, campaign: null });
    }
  };

  const handleDeleteUser = async (user) => {
    setDeleteUserModal({ isOpen: true, user });
  };

  const confirmDeleteUser = async () => {
    if (!deleteUserModal.user) return;
    const user = deleteUserModal.user;
    try {
      const res = await fetch(buildApiUrl(`/api/admin/users/${user.id}`), {
        method: 'DELETE', headers,
      });
      const data = await res.json();
      if (data.success) {
        setUsers(prev => prev.filter(u => u.id !== user.id));
        fetchStats();
        fetchAllCampaigns();
      }
      openFeedbackModal(
        data.success ? 'Utilisateur supprime' : 'Suppression impossible',
        data.message || 'Utilisateur supprime.',
        data.success ? 'success' : 'error'
      );
    } catch {
      openFeedbackModal('Erreur reseau', 'Impossible de supprimer cet utilisateur pour le moment.', 'error');
    } finally {
      setDeleteUserModal({ isOpen: false, user: null });
    }
  };

  // ── Toggle role ──────────────────────────────
  const handleToggleRole = async (user) => {
    const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
    setRoleConfirmModal({ isOpen: true, user, newRole });
  };

  const confirmToggleRole = async () => {
    if (!roleConfirmModal.user) return;

    const user = roleConfirmModal.user;
    const newRole = roleConfirmModal.newRole;
    try {
      const res = await fetch(buildApiUrl(`/api/admin/users/${user.id}/role`), {
        method: 'PUT', headers,
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (data.success) {
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
      }
      openFeedbackModal(
        data.success ? 'Role mis a jour' : 'Modification impossible',
        data.message || 'Le role a ete mis a jour.',
        data.success ? 'success' : 'error'
      );
    } catch {
      openFeedbackModal('Erreur reseau', 'Impossible de modifier le role pour le moment.', 'error');
    }
    setRoleConfirmModal({ isOpen: false, user: null, newRole: 'USER' });
  };

  // ── Rename user ──────────────────────────────
  const handleOpenEditUser = (user) => {
    setEditUserModal({
      isOpen: true,
      userId: user.id,
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'USER',
      bio: user.bio || '',
      avatar: user.avatar || '',
    });
  };

  const handleEditUserAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      openFeedbackModal('Image trop volumineuse', "Choisissez une image de 5 Mo maximum.", 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setEditUserModal(prev => ({ ...prev, avatar: event.target?.result || '' }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveEditedUser = async () => {
    if (!editUserModal.name.trim()) {
      openFeedbackModal('Nom requis', 'Le nom est obligatoire.', 'warning');
      return;
    }

    if (!editUserModal.email.trim()) {
      openFeedbackModal('Email requis', "L'email est obligatoire.", 'warning');
      return;
    }

    try {
      const res = await fetch(buildApiUrl(`/api/admin/users/${editUserModal.userId}`), {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          name: editUserModal.name.trim(),
          email: editUserModal.email.trim(),
          role: editUserModal.role,
          bio: editUserModal.bio,
          avatar: editUserModal.avatar,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setUsers(prev => prev.map(user => user.id === data.user.id ? data.user : user));
        if (data.user.id === currentUser.id) {
          localStorage.setItem('user', JSON.stringify({ ...currentUser, ...data.user }));
        }
        setEditUserModal({
          isOpen: false,
          userId: null,
          name: '',
          email: '',
          role: 'USER',
          bio: '',
          avatar: '',
        });
        openFeedbackModal('Utilisateur mis a jour', data.message || 'Les informations utilisateur ont ete enregistrees.', 'success');
      } else {
        openFeedbackModal('Mise a jour impossible', data.message || "Erreur lors de la mise a jour de l'utilisateur.", 'error');
      }
    } catch {
      openFeedbackModal('Erreur reseau', "Impossible de mettre a jour cet utilisateur pour le moment.", 'error');
    }
  };

  // ── Loading state ────────────────────────────
  if (loading) {
    return (
      <div className="admin-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#a1a1aa', fontSize: '18px' }}>Chargement du tableau de bord...</p>
      </div>
    );
  }

  // ── Error state ──────────────────────────────
  if (error && !stats) {
    return (
      <div className="admin-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
        <p style={{ color: '#f87171', fontSize: '16px' }}>{error}</p>
        <button className="btn-primary" onClick={() => onNavigate('home')}>Retour à l'accueil</button>
      </div>
    );
  }

  // ── Computed values ──────────────────────────
  const totalFunds = stats?.totalFunds || 0;
  const platformRevenue = totalFunds * (stats?.commissionRate || 0.05);
  const activeCampaigns = stats?.activeCampaigns || 0;
  const successRate = stats?.successRate || 0;
  const totalUsers = stats?.totalUsers || 0;
  const totalPaidDonations = stats?.totalPaidDonations || 0;
  const totalTarget = stats?.totalTarget || 0;
  const latestPaidDonations = stats?.latestPaidDonations || [];
  const categorySplit = stats?.categorySplit || [];
  const totalCategoryCount = categorySplit.reduce((sum, c) => sum + c.value, 0) || 1;
  const getCampaignStatusClass = (status) => {
    if (status === 'ACTIVE') return 'actif';
    if (status === 'PENDING') return 'attente';
    if (status === 'DRAFT') return 'attente';
    if (status === 'REJECTED') return 'refuse';
    return 'archive';
  };
  const getCampaignStatusLabel = (status) => {
    if (status === 'ACTIVE') return 'Active';
    if (status === 'PENDING') return 'En attente';
    if (status === 'DRAFT') return 'Brouillon';
    if (status === 'REJECTED') return 'RefusÃ©e';
    if (status === 'CLOSED') return 'ClÃ´turÃ©e';
    return status;
  };

  const formatCampaignStatus = (status) => {
    if (status === 'ACTIVE') return 'Active';
    if (status === 'PENDING') return 'En attente';
    if (status === 'DRAFT') return 'Brouillon';
    if (status === 'REJECTED') return 'Refusee';
    if (status === 'CLOSED') return 'Cloturee';
    return status;
  };

  const getPledgeStatusClass = (status) => {
    if (status === 'SUCCESS' || status === 'PAID') return 'actif';
    if (status === 'PENDING') return 'attente';
    if (status === 'FAILED' || status === 'EXPIRED' || status === 'CANCELED') return 'refuse';
    return 'archive';
  };

  const formatPledgeStatus = (status) => {
    if (status === 'SUCCESS' || status === 'PAID') return 'Confirme';
    if (status === 'PENDING') return 'En attente';
    if (status === 'FAILED') return 'Echoue';
    if (status === 'EXPIRED') return 'Expire';
    if (status === 'CANCELED') return 'Annule';
    return status;
  };

  return (
    <div className="admin-wrapper">
      
      {/* ──────── Sidebar ──────── */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-top">
          <span className="admin-logo" onClick={() => onNavigate('home')}>Hive.tn</span>
        </div>

        <div className="admin-nav">
          <div className={`admin-nav-item ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => handleAdminTabChange('analytics')}>
            <div className="nav-label"><span className="nav-icon">◱</span> Tableau de Bord</div>
          </div>

          <div className={`admin-nav-item ${activeTab === 'moderation' ? 'active' : ''}`} onClick={() => handleAdminTabChange('moderation')}>
            <div className="nav-label"><span className="nav-icon">⊟</span> Modération</div>
            {pendingCampaigns.length > 0 && <span className="nav-count">{pendingCampaigns.length}</span>}
          </div>

          <div className={`admin-nav-item ${activeTab === 'campaigns' ? 'active' : ''}`} onClick={() => handleAdminTabChange('campaigns')}>
            <div className="nav-label"><span className="nav-icon">◨</span> Toutes les campagnes</div>
            {allCampaigns.length > 0 && <span className="nav-count">{allCampaigns.length}</span>}
          </div>


          <div className={`admin-nav-item ${activeTab === 'support' ? 'active' : ''}`} onClick={() => handleAdminTabChange('support')}>
            <div className="nav-label"><span className="nav-icon">#</span> Support tickets</div>
          </div>

          <div className={`admin-nav-item ${activeTab === 'pledges' ? 'active' : ''}`} onClick={() => handleAdminTabChange('pledges')}>
            <div className="nav-label"><span className="nav-icon">�</span> Soutiens</div>
            {pledges.length > 0 && <span className="nav-count">{pledges.length}</span>}
          </div>
          <div className={`admin-nav-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => handleAdminTabChange('users')}>
            <div className="nav-label"><span className="nav-icon">☺</span> Utilisateurs & Rôles</div>
          </div>
        </div>

        {(() => {
          const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
          const initials = (storedUser.name || 'AD').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
          return (
            <div className="admin-sidebar-footer">
              <div className="sidebar-profile-avatar" style={storedUser.avatar ? { background: `url(${storedUser.avatar}) center/cover`, color: 'transparent' } : {}}>
                {storedUser.avatar ? '' : initials}
              </div>
              <div className="sidebar-profile-name">{storedUser.name || 'Administrateur'}</div>
              <div className="sidebar-profile-role">{storedUser.email || 'admin'}</div>
            </div>
          );
        })()}
      </aside>

      {/* ──────── Main Content ──────── */}
      <main className="admin-main">

        <header className="admin-header">
          <div className="admin-header-left">
            <div className="search-placeholder">
              <span>🔍</span> Rechercher...
            </div>
            <div className="admin-date">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          </div>
          <div className="admin-header-actions">
            <button className="btn-primary" onClick={() => onNavigate('home')}>Quitter l'Admin</button>
          </div>
        </header>

        <section className="admin-content">

          {/* ── TAB: Analytics ── */}
          {activeTab === 'analytics' && (
            <div className="fade-in">
              <div className="admin-widgets">
                <div className="admin-card">
                  <p className="widget-title">Montant Traite</p>
                  <p className="widget-value">{totalFunds.toLocaleString()} <span>DT</span></p>
                  <div className="widget-trend">{totalPaidDonations} donation{totalPaidDonations > 1 ? 's' : ''} payee{totalPaidDonations > 1 ? 's' : ''}</div>
                </div>
                <div className="admin-card">
                  <p className="widget-title">Revenus Plateforme (5%)</p>
                  <p className="widget-value">{platformRevenue.toLocaleString()} <span>DT</span></p>
                  <div className="widget-trend">Base sur les paiements verifies</div>
                </div>
                <div className="admin-card">
                  <p className="widget-title">Campagnes Actives</p>
                  <p className="widget-value">{activeCampaigns}</p>
                  <div className="widget-trend">{stats?.pendingCampaigns || 0} en attente</div>
                </div>
                <div className="admin-card">
                  <p className="widget-title">Taux de Succès</p>
                  <p className="widget-value">{successRate} <span>%</span></p>
                  <div className="widget-trend">{totalUsers.toLocaleString()} Utilisateurs</div>
                </div>
              </div>

              <div className="analytics-grid">
                <div className="admin-table-wrapper" style={{ padding: '0', background: 'transparent', boxShadow: 'none' }}>
                  <div className="analytics-card">
                    <p className="analytics-card-title">Répartition par Secteur</p>
                    {categorySplit.length > 0 ? categorySplit.map(cat => (
                      <div className="category-bar-item" key={cat.name}>
                        <div className="category-bar-header">
                          <span className="category-bar-label">{cat.name}</span>
                          <span className="category-bar-pct">{Math.round((cat.value / totalCategoryCount) * 100)}%</span>
                        </div>
                        <div className="progress-bar-bg">
                          <div className="progress-bar-fill" style={{ width: `${Math.round((cat.value / totalCategoryCount) * 100)}%` }}></div>
                        </div>
                      </div>
                    )) : (
                      <p style={{ color: '#a1a1aa', fontSize: '14px', padding: '20px 0' }}>Aucune donnée de catégorie disponible.</p>
                    )}
                  </div>
                </div>

                <div className="admin-table-wrapper">
                  <div className="table-header-bar">
                    <h4>Résumé Rapide</h4>
                  </div>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Métrique</th>
                        <th>Valeur</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="cell-primary">Campagnes brouillon</td>
                        <td className="cell-secondary">{stats?.draftCampaigns || 0}</td>
                      </tr>
                      <tr>
                        <td className="cell-primary">En attente de modération</td>
                        <td className="cell-secondary">{stats?.pendingCampaigns || 0}</td>
                      </tr>
                      <tr>
                        <td className="cell-primary">Campagnes actives</td>
                        <td className="cell-secondary">{stats?.activeCampaigns || 0}</td>
                      </tr>
                      <tr>
                        <td className="cell-primary">Campagnes clôturées</td>
                        <td className="cell-secondary">{stats?.closedCampaigns || 0}</td>
                      </tr>
                      <tr>
                        <td className="cell-primary">Utilisateurs inscrits</td>
                        <td className="cell-secondary">{totalUsers}</td>
                      </tr>
                      <tr>
                        <td className="cell-primary">Objectifs cumules</td>
                        <td className="cell-secondary">{totalTarget.toLocaleString()} DT</td>
                      </tr>
                      <tr>
                        <td className="cell-primary">Donations payees</td>
                        <td className="cell-secondary">{totalPaidDonations}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="admin-table-wrapper" style={{ marginTop: '24px' }}>
                <div className="table-header-bar">
                  <h4>Derniers paiements verifies</h4>
                </div>
                {latestPaidDonations.length === 0 ? (
                  <p style={{ color: '#a1a1aa', padding: '24px 0' }}>Aucun paiement Konnect confirme pour le moment.</p>
                ) : (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Donateur</th>
                        <th>Campagne</th>
                        <th>Montant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {latestPaidDonations.map((donation) => (
                        <tr key={donation.id}>
                          <td className="cell-secondary">
                            {donation.paidAt ? new Date(donation.paidAt).toLocaleString('fr-FR') : 'Non disponible'}
                          </td>
                          <td className="cell-primary">{donation.donorName || 'Utilisateur inconnu'}</td>
                          <td className="cell-primary">{donation.campaignTitle || 'Campagne inconnue'}</td>
                          <td className="cell-primary">{Number(donation.amountTnd || 0).toLocaleString('fr-FR')} DT</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ── TAB: Modération ── */}
          {activeTab === 'moderation' && (
            <div className="fade-in admin-table-wrapper">
              <div className="table-header-bar">
                <h4>En attente de Modération ({pendingCampaigns.length})</h4>
              </div>
              {pendingCampaigns.length === 0 ? (
                <p style={{ color: '#a1a1aa', padding: '40px', textAlign: 'center' }}>
                  ✅ Aucune campagne en attente de modération.
                </p>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Titre de la Campagne</th>
                      <th>Créateur</th>
                      <th>Objectif</th>
                      <th>Catégorie</th>
                      <th>Créée le</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingCampaigns.map(camp => (
                      <tr key={camp.id}>
                        <td className="cell-primary">{camp.title}</td>
                        <td className="cell-secondary">{camp.creator_name}</td>
                        <td className="cell-primary">{(camp.target_amount / 1000).toLocaleString()} DT</td>
                        <td><span className="status-badge attente">{camp.category}</span></td>
                        <td className="cell-secondary">{new Date(camp.created_at).toLocaleDateString('fr-FR')}</td>
                        <td>
                          <button className="action-btn" onClick={() => handleApprove(camp.id)}>Approuver</button>
                          <button className="action-btn" onClick={() => setViewModal({ isOpen: true, campaign: camp })} style={{ color: '#0ea5e9' }}>Détails</button>
                          <button className="action-btn" onClick={() => handleOpenCampaignComments(camp)} style={{ color: '#22c55e' }}>Commentaires</button>
                          <button className="action-btn" onClick={() => handleRejectClick(camp.id)} style={{ color: '#ef4444' }}>Refuser</button>
                          <button className="action-btn" onClick={() => handleDeleteCampaign(camp)} style={{ color: '#f97316' }}>Supprimer</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── TAB: Validation Funds ── */}
          {activeTab === 'campaigns' && (
            <div className="fade-in admin-table-wrapper">
              <div className="table-header-bar">
                <h4>Toutes les campagnes ({allCampaigns.length})</h4>
              </div>
              {allCampaigns.length === 0 ? (
                <p style={{ color: '#a1a1aa', padding: '40px', textAlign: 'center' }}>
                  Aucune campagne trouvée.
                </p>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Titre</th>
                      <th>Créateur</th>
                      <th>Catégorie</th>
                      <th>Objectif</th>
                      <th>Collecte</th>
                      <th>Statut</th>
                      <th>Créée le</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allCampaigns.map(campaign => (
                      <tr key={campaign.id}>
                        <td className="cell-primary">{campaign.title}</td>
                        <td className="cell-secondary">{campaign.creator_name}</td>
                        <td className="cell-secondary">{campaign.category || 'Non catégorisé'}</td>
                        <td className="cell-primary">{(campaign.target_amount / 1000).toLocaleString()} DT</td>
                        <td>
                          <div className="cell-primary">{(Number(campaign.current_amount || 0) / 1000).toLocaleString('fr-FR')} DT</div>
                          <div className="cell-secondary">{campaign.paid_donation_count || 0} don{campaign.paid_donation_count > 1 ? 's' : ''} paye{campaign.paid_donation_count > 1 ? 's' : ''}</div>
                        </td>
                        <td>
                          <span className={`status-badge ${getCampaignStatusClass(campaign.status)}`}>
                            {formatCampaignStatus(campaign.status)}
                          </span>
                        </td>
                        <td className="cell-secondary">{new Date(campaign.created_at).toLocaleDateString('fr-FR')}</td>
                        <td>
                          {campaign.status === 'ACTIVE' ? (
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              <button className="action-btn" onClick={() => handleOpenEditCampaign(campaign)}>
                                Modifier
                              </button>
                              <button className="action-btn" onClick={() => handleOpenCampaignComments(campaign)} style={{ color: '#22c55e' }}>
                                Commentaires
                              </button>
                              <button className="action-btn" onClick={() => handleDeleteCampaign(campaign)} style={{ color: '#f97316' }}>
                                Supprimer
                              </button>
                            </div>
                          ) : campaign.status === 'DRAFT' || campaign.status === 'PENDING' ? (
                            <button className="action-btn" onClick={() => handleDeleteCampaign(campaign)} style={{ color: '#f97316' }}>
                              Supprimer
                            </button>
                          ) : (
                            <span style={{ color: '#6b7280', fontSize: '12px' }}>Non modifiable</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'support' && (
            <AdminSupportWorkspace />
          )}

          {activeTab === 'pledges' && (
            <div className="fade-in admin-table-wrapper">
              <div className="table-header-bar">
                <h4>Tous les soutiens ({pledges.length})</h4>
              </div>
              {pledges.length === 0 ? (
                <p style={{ color: '#a1a1aa', padding: '40px', textAlign: 'center' }}>
                  Aucun soutien enregistre pour le moment.
                </p>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Source</th>
                      <th>Montant</th>
                      <th>Statut</th>
                      <th>Utilisateur</th>
                      <th>Campagne</th>
                      <th>Createur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pledges.map((pledge) => (
                      <tr key={pledge.id}>
                        <td className="cell-secondary">
                          {(pledge.paid_at || pledge.created_at) ? new Date(pledge.paid_at || pledge.created_at).toLocaleString('fr-FR') : 'Non disponible'}
                        </td>
                        <td>
                          <div className="cell-primary">{pledge.provider === 'legacy' ? 'Legacy MVP' : (pledge.provider || 'konnect')}</div>
                          <div className="cell-secondary">{pledge.provider_payment_ref || pledge.provider_order_id || pledge.provider_short_id || '-'}</div>
                        </td>
                        <td className="cell-primary">
                          {(Number(pledge.amount || 0) / 1000).toLocaleString('fr-FR')} DT
                        </td>
                        <td>
                          <span className={`status-badge ${getPledgeStatusClass(pledge.status)}`}>
                            {formatPledgeStatus(pledge.status)}
                          </span>
                        </td>
                        <td>
                          <div className="cell-primary">{pledge.donor_name || 'Utilisateur inconnu'}</div>
                          <div className="cell-secondary">{pledge.donor_email || '-'}</div>
                        </td>
                        <td>
                          <div className="cell-primary">{pledge.campaign_title || 'Campagne inconnue'}</div>
                          <div className="cell-secondary">{pledge.campaign_category || 'Sans categorie'} � {formatCampaignStatus(pledge.campaign_status)}</div>
                        </td>
                        <td>
                          <div className="cell-primary">{pledge.creator_name || 'Createur inconnu'}</div>
                          <div className="cell-secondary">{pledge.creator_email || '-'}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
          {/* ── TAB: Users ── */}
          {activeTab === 'users' && (
            <div className="fade-in admin-table-wrapper">
              <div className="table-header-bar">
                <h4>Utilisateurs de la Plateforme ({users.length})</h4>
              </div>
              {users.length === 0 ? (
                <p style={{ color: '#a1a1aa', padding: '40px', textAlign: 'center' }}>Aucun utilisateur trouvé.</p>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Rôle</th>
                      <th>Email</th>
                      <th>Inscrit le</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => {
                      const isSelf = u.id === currentUser.id;
                      return (
                        <tr key={u.id}>
                          <td className="cell-primary">{u.name}</td>
                          <td>
                            <span className={`status-badge ${u.role === 'ADMIN' ? 'actif' : 'attente'}`}>
                              {u.role === 'ADMIN' ? 'Admin' : 'Utilisateur'}
                            </span>
                          </td>
                          <td className="cell-secondary">{u.email}</td>
                          <td className="cell-secondary">{new Date(u.created_at).toLocaleDateString('fr-FR')}</td>
                          <td>
                            {isSelf ? (
                              <span style={{ color: '#a1a1aa', fontSize: '12px', fontStyle: 'italic' }}>Vous (protégé)</span>
                            ) : (
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                <button className="action-btn user-edit-btn" data-label="Modifier" onClick={() => handleOpenEditUser(u)} title="Modifier l'utilisateur">
                                  ✏️ Renommer
                                </button>
                                <button
                                  className="action-btn"
                                  onClick={() => handleToggleRole(u)}
                                  style={{ color: u.role === 'ADMIN' ? '#f59e0b' : '#10b981' }}
                                  title={u.role === 'ADMIN' ? 'Rétrograder en Utilisateur' : 'Promouvoir en Admin'}
                                >
                                  {u.role === 'ADMIN' ? '⬇ Rétrograder' : '⬆ Promouvoir'}
                                </button>
                                <button
                                  className="action-btn"
                                  onClick={() => handleDeleteUser(u)}
                                  style={{ color: '#ef4444' }}
                                  title="Supprimer définitivement"
                                >
                                  🗑 Supprimer
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

        </section>
      </main>

      {/* ──────── Modal de Refus ──────── */}
      {rejectModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Refuser la Campagne</h3>
            <p className="modal-desc">
              Fournissez une raison détaillée. Celle-ci sera automatiquement envoyée par email au créateur de la campagne.
            </p>
            <textarea
              className="modal-textarea"
              placeholder="Ex : Le plan d'affaires est incomplet..."
              value={rejectModal.reason}
              onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
            />
            <div className="modal-actions">
              <button className="action-btn" onClick={() => setRejectModal({ isOpen: false, campaignId: null, reason: '' })}>Annuler</button>
              <button className="btn-reject-confirm" onClick={confirmRejection}>Envoyer le Refus</button>
            </div>
          </div>
        </div>
      )}

      {/* ──────── Modal de Détails (View 360) ──────── */}
      {commentsModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content admin-comments-modal">
            <div className="admin-comments-modal__header">
              <div>
                <h3 className="modal-title">Commentaires de campagne</h3>
                <p className="modal-desc">
                  {commentsModal.campaign?.title || 'Campagne'} · {commentsModal.comments.filter((comment) => !comment.is_deleted).length} visible(s)
                </p>
              </div>
              <button
                className="action-btn"
                onClick={() => setCommentsModal(emptyCommentsModal())}
              >
                Fermer
              </button>
            </div>

            {commentsModal.loading ? (
              <div className="admin-comments-empty">Chargement des commentaires...</div>
            ) : commentsModal.error ? (
              <div className="admin-comments-empty admin-comments-empty--error">{commentsModal.error}</div>
            ) : commentsModal.comments.length === 0 ? (
              <div className="admin-comments-empty">Aucun commentaire sur cette campagne pour le moment.</div>
            ) : (
              <div className="admin-comments-list">
                {commentsModal.comments.map((comment) => (
                  <article key={comment.id} className={`admin-comment-card ${comment.is_deleted ? 'is-deleted' : ''}`}>
                    <div className="admin-comment-card__meta">
                      <div>
                        <strong>{comment.author_name || 'Utilisateur inconnu'}</strong>
                        <span>{comment.author_email || 'Email indisponible'}</span>
                      </div>
                      <div className="admin-comment-card__aside">
                        <span>{comment.created_at ? new Date(comment.created_at).toLocaleString('fr-FR') : 'Date inconnue'}</span>
                        <span className={`admin-comment-status ${comment.is_deleted ? 'is-deleted' : 'is-active'}`}>
                          {comment.is_deleted ? 'Supprime' : 'Visible'}
                        </span>
                      </div>
                    </div>
                    <p className="admin-comment-card__content">{comment.content}</p>
                    {!comment.is_deleted && (
                      <div className="admin-comment-card__actions">
                        <button
                          className="action-btn"
                          style={{ color: '#ef4444' }}
                          onClick={() => handleDeleteAdminComment(comment)}
                        >
                          Supprimer
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {deleteCommentModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content admin-delete-comment-modal">
            <div className="admin-delete-comment-modal__icon">✦</div>
            <h3 className="modal-title admin-delete-comment-modal__title">Supprimer ce commentaire ?</h3>
            <p className="modal-desc admin-delete-comment-modal__desc">
              Ce commentaire disparaitra immediatement de la page publique de la campagne.
            </p>
            <div className="admin-delete-comment-modal__preview">
              {deleteCommentModal.comment?.content}
            </div>
            <div className="modal-actions admin-delete-comment-modal__actions">
              <button
                className="action-btn"
                onClick={() => setDeleteCommentModal({ isOpen: false, comment: null })}
              >
                Garder le commentaire
              </button>
              <button className="btn-reject-confirm" onClick={confirmDeleteAdminComment}>
                Oui, supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteCampaignModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content admin-delete-comment-modal">
            <div className="admin-delete-comment-modal__icon">!</div>
            <h3 className="modal-title admin-delete-comment-modal__title">Supprimer cette campagne ?</h3>
            <p className="modal-desc admin-delete-comment-modal__desc">
              Cette action retirera definitivement la campagne de la plateforme.
            </p>
            <div className="admin-delete-comment-modal__preview">
              <strong>{deleteCampaignModal.campaign?.title}</strong>
              <br />
              Statut : {deleteCampaignModal.campaign?.status || 'Inconnu'}
            </div>
            <div className="modal-actions admin-delete-comment-modal__actions">
              <button
                className="action-btn"
                onClick={() => setDeleteCampaignModal({ isOpen: false, campaign: null })}
              >
                Garder la campagne
              </button>
              <button className="btn-reject-confirm" onClick={confirmDeleteCampaign}>
                Oui, supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteUserModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content admin-delete-comment-modal">
            <div className="admin-delete-comment-modal__icon">!</div>
            <h3 className="modal-title admin-delete-comment-modal__title">Supprimer cet utilisateur ?</h3>
            <p className="modal-desc admin-delete-comment-modal__desc">
              Toutes ses campagnes seront egalement supprimees. Cette action est irreversible.
            </p>
            <div className="admin-delete-comment-modal__preview">
              <strong>{deleteUserModal.user?.name}</strong>
              <br />
              {deleteUserModal.user?.email}
            </div>
            <div className="modal-actions admin-delete-comment-modal__actions">
              <button
                className="action-btn"
                onClick={() => setDeleteUserModal({ isOpen: false, user: null })}
              >
                Annuler
              </button>
              <button className="btn-reject-confirm" onClick={confirmDeleteUser}>
                Oui, supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {feedbackModal.isOpen && (
        <div className="modal-overlay">
          <div className={`modal-content admin-feedback-modal admin-feedback-modal--${feedbackModal.variant}`}>
            <div className="admin-feedback-modal__icon">
              {feedbackModal.variant === 'error' ? '!' : feedbackModal.variant === 'warning' ? 'i' : '✓'}
            </div>
            <h3 className="modal-title admin-feedback-modal__title">{feedbackModal.title}</h3>
            <p className="modal-desc admin-feedback-modal__desc">{feedbackModal.message}</p>
            <div className="modal-actions admin-feedback-modal__actions">
              <button
                className="btn-primary"
                onClick={() => setFeedbackModal({ isOpen: false, title: '', message: '', variant: 'success' })}
              >
                Continuer
              </button>
            </div>
          </div>
        </div>
      )}

      {roleConfirmModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content admin-role-confirm-modal">
            <div className="admin-role-confirm-modal__icon">
              {roleConfirmModal.newRole === 'ADMIN' ? '↑' : '↓'}
            </div>
            <h3 className="modal-title admin-role-confirm-modal__title">
              {roleConfirmModal.newRole === 'ADMIN' ? 'Promouvoir cet utilisateur ?' : 'Retirer les droits admin ?'}
            </h3>
            <p className="modal-desc admin-role-confirm-modal__desc">
              {roleConfirmModal.newRole === 'ADMIN'
                ? `"${roleConfirmModal.user?.name}" obtiendra l acces complet au dashboard d administration.`
                : `"${roleConfirmModal.user?.name}" repassera en role utilisateur standard.`}
            </p>
            <div className="modal-actions admin-role-confirm-modal__actions">
              <button
                className="action-btn"
                onClick={() => setRoleConfirmModal({ isOpen: false, user: null, newRole: 'USER' })}
              >
                Annuler
              </button>
              <button className="btn-primary" onClick={confirmToggleRole}>
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {editCampaignModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '760px', width: '90%', maxHeight: '85vh', overflowY: 'auto', textAlign: 'left' }}>
            <h3 className="modal-title">Modifier une campagne active</h3>
            <p className="modal-desc">
              L'administrateur peut corriger les informations de base d'une campagne acceptée.
            </p>

            <div style={{ display: 'grid', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: '#d1d5db', fontSize: '14px' }}>Image de campagne</label>
                <div className="admin-avatar-editor">
                  <label
                    className="admin-avatar-upload"
                    style={editCampaignModal.imagePreview ? {
                      backgroundImage: `url(${editCampaignModal.imagePreview})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      color: 'transparent',
                    } : {}}
                  >
                    {editCampaignModal.imagePreview ? "Apercu de l'image" : 'Choisir une image'}
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleEditCampaignImageChange}
                    />
                  </label>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <span style={{ color: '#8b949e', fontSize: '12px' }}>
                      {editCampaignModal.imageFile ? 'Nouvelle image prete a etre enregistree. La video sera retiree.' : "Une campagne ne peut garder qu'un seul media principal a la fois."}
                    </span>
                    {editCampaignModal.imagePreview && (
                      <button
                        type="button"
                        className="action-btn"
                        style={{ color: '#ef4444' }}
                        onClick={() => setEditCampaignModal(prev => ({
                          ...prev,
                          imageUrl: '',
                          imagePreview: '',
                          imageFile: null,
                        }))}
                      >
                        Supprimer l'image
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: '#d1d5db', fontSize: '14px' }}>Video de campagne</label>
                <div className="admin-avatar-editor">
                  <label className="admin-avatar-upload admin-video-upload">
                    {editCampaignModal.videoPreview ? (
                      <video
                        src={editCampaignModal.videoPreview}
                        controls
                        className="admin-campaign-video-preview"
                      />
                    ) : (
                      'Choisir une video'
                    )}
                    <input
                      type="file"
                      accept="video/*"
                      style={{ display: 'none' }}
                      onChange={handleEditCampaignVideoChange}
                    />
                  </label>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <span style={{ color: '#8b949e', fontSize: '12px' }}>
                      {editCampaignModal.videoFile ? 'Nouvelle video prete a etre enregistree. L image sera retiree.' : "Une campagne ne peut garder qu'un seul media principal a la fois."}
                    </span>
                    {editCampaignModal.videoPreview && (
                      <button
                        type="button"
                        className="action-btn"
                        style={{ color: '#ef4444' }}
                        onClick={() => setEditCampaignModal(prev => ({
                          ...prev,
                          videoUrl: '',
                          videoPreview: '',
                          videoFile: null,
                        }))}
                      >
                        Supprimer la video
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: '#d1d5db', fontSize: '14px' }}>Titre</label>
                <input
                  className="modal-textarea"
                  style={{ minHeight: 'auto', height: '46px' }}
                  value={editCampaignModal.title}
                  onChange={(e) => setEditCampaignModal(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: '#d1d5db', fontSize: '14px' }}>Description</label>
                <textarea
                  className="modal-textarea"
                  value={editCampaignModal.description}
                  onChange={(e) => setEditCampaignModal(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#d1d5db', fontSize: '14px' }}>Catégorie</label>
                  <input
                    className="modal-textarea"
                    style={{ minHeight: 'auto', height: '46px' }}
                    value={editCampaignModal.category}
                    onChange={(e) => setEditCampaignModal(prev => ({ ...prev, category: e.target.value }))}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#d1d5db', fontSize: '14px' }}>Objectif (TND)</label>
                  <input
                    type="number"
                    className="modal-textarea"
                    style={{ minHeight: 'auto', height: '46px' }}
                    value={editCampaignModal.targetAmount}
                    onChange={(e) => setEditCampaignModal(prev => ({ ...prev, targetAmount: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="modal-actions" style={{ position: 'sticky', bottom: 0, background: '#161b22', paddingTop: '16px' }}>
              <button
                className="action-btn"
                onClick={() => setEditCampaignModal(emptyEditCampaignModal())}
              >
                Annuler
              </button>
              <button className="btn-primary" onClick={handleSaveEditedCampaign}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {editUserModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '760px', width: '90%', textAlign: 'left' }}>
            <h3 className="modal-title">Modifier un utilisateur</h3>
            <p className="modal-desc">
              L'administrateur peut mettre a jour les informations du compte et le role.
            </p>

            <div style={{ display: 'grid', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#d1d5db', fontSize: '14px' }}>Nom</label>
                  <input
                    className="modal-textarea"
                    style={{ minHeight: 'auto', height: '46px' }}
                    value={editUserModal.name}
                    onChange={(e) => setEditUserModal(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#d1d5db', fontSize: '14px' }}>Role</label>
                  <select
                    className="modal-textarea"
                    style={{ minHeight: 'auto', height: '46px' }}
                    value={editUserModal.role}
                    onChange={(e) => setEditUserModal(prev => ({ ...prev, role: e.target.value }))}
                  >
                    <option value="USER">Utilisateur</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: '#d1d5db', fontSize: '14px' }}>Email</label>
                <input
                  className="modal-textarea"
                  style={{ minHeight: 'auto', height: '46px' }}
                  value={editUserModal.email}
                  onChange={(e) => setEditUserModal(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: '#d1d5db', fontSize: '14px' }}>Bio</label>
                <textarea
                  className="modal-textarea"
                  value={editUserModal.bio}
                  onChange={(e) => setEditUserModal(prev => ({ ...prev, bio: e.target.value }))}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: '#d1d5db', fontSize: '14px' }}>Avatar</label>
                <div className="admin-avatar-editor">
                  <label
                    className="admin-avatar-upload"
                    style={editUserModal.avatar ? {
                      backgroundImage: `url(${editUserModal.avatar})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      color: 'transparent',
                    } : {}}
                  >
                    {editUserModal.avatar ? 'Avatar actuel' : 'Choisir une image'}
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleEditUserAvatarChange}
                    />
                  </label>
                  {editUserModal.avatar && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                      <span style={{ color: '#8b949e', fontSize: '12px' }}>Apercu de l'image actuelle</span>
                      <button
                        type="button"
                        className="action-btn"
                        style={{ color: '#ef4444' }}
                        onClick={() => setEditUserModal(prev => ({ ...prev, avatar: '' }))}
                      >
                        Supprimer l'image
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="action-btn"
                onClick={() => setEditUserModal({
                  isOpen: false,
                  userId: null,
                  name: '',
                  email: '',
                  role: 'USER',
                  bio: '',
                  avatar: '',
                })}
              >
                Annuler
              </button>
              <button className="btn-primary" onClick={handleSaveEditedUser}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {viewModal.isOpen && viewModal.campaign && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px', width: '90%', maxHeight: '85vh', overflowY: 'auto', textAlign: 'left' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '24px', color: '#fff', margin: 0 }}>Détails de la Campagne</h2>
              <button onClick={() => setViewModal({ isOpen: false, campaign: null })} style={{ background: 'none', border: 'none', color: '#a1a1aa', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', color: '#a1a1aa', marginBottom: '10px', textTransform: 'uppercase' }}>Informations de Base</h3>
              <p><strong>Titre :</strong> {viewModal.campaign.title}</p>
              <p><strong>Catégorie :</strong> {viewModal.campaign.category}</p>
              <p><strong>Objectif :</strong> {(viewModal.campaign.target_amount / 1000).toLocaleString()} TND</p>
              <p><strong>Date de création :</strong> {viewModal.campaign.created_at ? new Date(viewModal.campaign.created_at).toLocaleDateString('fr-FR') : 'Non disponible'}</p>
              <p><strong>Créateur :</strong> {viewModal.campaign.creator_name} ({viewModal.campaign.creator_email})</p>
              <div style={{ marginTop: '15px' }}>
                <strong>Sous-titre / Description :</strong>
                <p style={{ marginTop: '5px', color: '#d1d1d6', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                  {viewModal.campaign.description || <span style={{ fontStyle: 'italic', color: '#6b7280' }}>Aucune description fournie.</span>}
                </p>
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', color: '#a1a1aa', marginBottom: '10px', textTransform: 'uppercase' }}>Récompenses Proposées</h3>
              {!viewModal.campaign.rewards || viewModal.campaign.rewards.length === 0 ? (
                <p style={{ fontStyle: 'italic', color: '#6b7280' }}>Aucune récompense ajoutée par le créateur.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {viewModal.campaign.rewards.map((rew, idx) => (
                    <div key={idx} style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      {(rew.image || rew.image_url) && (
                        <img
                          src={resolveMediaUrl(rew.image || rew.image_url)}
                          alt={rew.title || `Recompense ${idx + 1}`}
                          style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', borderRadius: '8px', marginBottom: '12px' }}
                        />
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <strong style={{ fontSize: '16px', color: '#fff' }}>{rew.title}</strong>
                        <strong style={{ color: '#0ce688' }}>{rew.price} TND</strong>
                      </div>
                      {rew.desc && <p style={{ color: '#a1a1aa', fontSize: '14px', margin: 0 }}>{rew.desc}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', color: '#a1a1aa', marginBottom: '10px', textTransform: 'uppercase' }}>Histoire du Projet</h3>
              <div style={{ color: '#d1d1d6', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                {viewModal.campaign.story ? (
                  viewModal.campaign.story
                ) : (
                  <span style={{ fontStyle: 'italic', color: '#6b7280' }}>L'histoire détaillée n'est pas encore complétée.</span>
                )}
              </div>
            </div>
            
            <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
              <button className="action-btn" onClick={() => setViewModal({ isOpen: false, campaign: null })}>Fermer</button>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="action-btn" onClick={() => {
                  handleApprove(viewModal.campaign.id);
                  setViewModal({ isOpen: false, campaign: null });
                }}>Approuver</button>
                <button className="btn-reject-confirm" onClick={() => {
                  handleRejectClick(viewModal.campaign.id);
                  setViewModal({ isOpen: false, campaign: null });
                }}>Refuser</button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;






import React, { useState, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';

// Lazy loading components
const Home = React.lazy(() => import('./Home'));
const SignIn = React.lazy(() => import('./SignIn'));
const SignUp = React.lazy(() => import('./SignUp'));
const GoogleAuthCallback = React.lazy(() => import('./GoogleAuthCallback'));
const ForgotPassword = React.lazy(() => import('./ForgotPassword'));
const Settings = React.lazy(() => import('./Settings'));
const Profile = React.lazy(() => import('./Profile'));
const SavedProjects = React.lazy(() => import('./SavedProjects'));
const ProjectDetails = React.lazy(() => import('./ProjectDetails'));
const Discover = React.lazy(() => import('./Discover'));
const StartProject = React.lazy(() => import('./StartProject'));
const CreateProjectStep1 = React.lazy(() => import('./CreateProjectStep1'));
const CreateProjectStep2 = React.lazy(() => import('./CreateProjectStep2'));
const CreateProjectStep3 = React.lazy(() => import('./CreateProjectStep3'));
const ProjectEditor = React.lazy(() => import('./ProjectEditor'));
const AdminDashboard = React.lazy(() => import('./AdminDashboard'));
const DonationPage = React.lazy(() => import('./DonationPage'));
const PaymentSuccess = React.lazy(() => import('./PaymentSuccess'));
const PaymentFail = React.lazy(() => import('./PaymentFail'));
const SupportTicketsPage = React.lazy(() => import('./SupportTicketsPage'));
const CreateSupportTicketPage = React.lazy(() => import('./CreateSupportTicketPage'));
const SupportTicketDetailsPage = React.lazy(() => import('./SupportTicketDetailsPage'));
const Footer = React.lazy(() => import('./components/Footer'));

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('token'));
  const [signInMessage, setSignInMessage] = useState('');

  // Déterminer où cacher le footer
  const hideFooterRoutes = [
    '/login', 
    '/register', 
    '/auth/google/callback',
    '/forgot-password', 
    '/create/', 
    '/editor', 
    '/admin',
    '/support'
  ];
  const shouldShowFooter =
    !hideFooterRoutes.some(path => location.pathname.startsWith(path)) &&
    !location.pathname.endsWith('/soutenir');

  const [draftProject, setDraftProject] = useState({
    category: '',
    title: '',
    subtitle: '',
    goal: '',
    image_url: '',
    video_url: '',
    rewards: [],
    story: {
      blocks: [],
      risks: '',
      faqs: [],
    },
    campaignId: null,
  });

  // Mapping des vues vers les routes URL (compatible avec onNavigate existant)
  const handleNavigate = (view, payload = '') => {
    if (view === 'signIn' && payload) setSignInMessage(payload);

    if (view === 'projectDetails') {
      const campaignId = typeof payload === 'object' ? payload?.id : payload;
      navigate(campaignId ? `/project/${campaignId}` : '/project');
      return;
    }

    if (view === 'donationPage') {
      const campaignId = typeof payload === 'object' ? payload?.id : payload;
      navigate(campaignId ? `/project/${campaignId}?support=1` : '/discover');
      return;
    }

    if (view === 'projectEditor') {
      const campaignId = typeof payload === 'object' ? payload?.id : payload;
      navigate(campaignId ? `/editor/${campaignId}` : '/editor');
      return;
    }

    const routeMap = {
      'home': '/',
      'signIn': '/login',
      'signUp': '/register',
      'forgotPassword': '/forgot-password',
      'settings': '/settings',
      'profile': '/profile',
      'saved': '/saved',
      'discover': '/discover',
      'startProject': '/start',
      'createProjectStep1': '/create/step1',
      'createProjectStep2': '/create/step2',
      'createProjectStep3': '/create/step3',
      'support': '/support',
      'newSupportTicket': '/support/new',
      'adminDashboard': '/admin',
    };

    if (routeMap[view]) {
      navigate(routeMap[view]);
    } else {
      console.warn(`Aucune route définie pour la vue : ${view}`);
      navigate('/');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    navigate('/');
  };

  return (
    <Suspense fallback={
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', color: '#0ce688', backgroundColor: '#0b0f19' }}>
        Chargement...
      </div>
    }>
      <Routes>
        {/* Pages publiques */}
        <Route path="/" element={<Home isAuthenticated={isAuthenticated} onNavigate={handleNavigate} onLogout={handleLogout} />} />
        <Route path="/login" element={<SignIn message={signInMessage} onSwitch={() => { setSignInMessage(''); navigate('/register'); }} onForgotPassword={() => navigate('/forgot-password')} onHome={() => navigate('/')} onLoginSuccess={(token, user) => { setIsAuthenticated(true); setSignInMessage(''); if (user.role === 'ADMIN') { navigate('/admin'); } else { navigate('/'); } }} />} />
        <Route path="/register" element={<SignUp onSwitch={() => navigate('/login')} onHome={() => navigate('/')} />} />
        <Route path="/auth/google/callback" element={<GoogleAuthCallback onAuthSuccess={(token, user) => { setIsAuthenticated(true); setSignInMessage(''); if (user.role === 'ADMIN') { navigate('/admin'); } else { navigate('/'); } }} />} />
        <Route path="/forgot-password" element={<ForgotPassword onSwitch={() => navigate('/login')} onHome={() => navigate('/')} />} />

        {/* Pages principales */}
        <Route path="/discover" element={<Discover isAuthenticated={isAuthenticated} onNavigate={handleNavigate} onLogout={handleLogout} />} />
        <Route path="/project" element={<ProjectDetails isAuthenticated={isAuthenticated} onNavigate={handleNavigate} onLogout={handleLogout} onLoginSuccess={() => setIsAuthenticated(true)} />} />
        <Route path="/project/:id" element={<ProjectDetails isAuthenticated={isAuthenticated} onNavigate={handleNavigate} onLogout={handleLogout} onLoginSuccess={() => setIsAuthenticated(true)} />} />
        <Route path="/project/:id/soutenir" element={<DonationPage isAuthenticated={isAuthenticated} onNavigate={handleNavigate} onLogout={handleLogout} onLoginSuccess={() => setIsAuthenticated(true)} />} />
        <Route path="/payment/success" element={<PaymentSuccess isAuthenticated={isAuthenticated} onNavigate={handleNavigate} onLogout={handleLogout} />} />
        <Route path="/payment/fail" element={<PaymentFail isAuthenticated={isAuthenticated} onNavigate={handleNavigate} onLogout={handleLogout} />} />

        {/* Création de projets */}
        <Route path="/start" element={<StartProject isAuthenticated={isAuthenticated} onNavigate={handleNavigate} onLogout={handleLogout} />} />
        <Route path="/create/step1" element={<CreateProjectStep1 onNavigate={handleNavigate} onSaveDraft={(data) => setDraftProject(prev => ({...prev, ...data}))} draftProject={draftProject} />} />
        <Route path="/create/step2" element={<CreateProjectStep2 onNavigate={handleNavigate} />} />
        <Route path="/create/step3" element={<CreateProjectStep3 onNavigate={handleNavigate} onSaveDraft={(data) => setDraftProject(prev => ({...prev, ...data}))} draftProject={draftProject} />} />
        <Route path="/editor/:id?" element={<ProjectEditor onNavigate={handleNavigate} draftProject={draftProject} onSaveDraft={(data) => setDraftProject(prev => ({...prev, ...data}))} />} />

        {/* Profil & paramètres */}
        <Route path="/settings" element={<Settings isAuthenticated={isAuthenticated} onNavigate={handleNavigate} onLogout={handleLogout} />} />
        <Route path="/profile" element={<Profile isAuthenticated={isAuthenticated} onNavigate={handleNavigate} onLogout={handleLogout} />} />
        <Route path="/saved" element={<SavedProjects isAuthenticated={isAuthenticated} onNavigate={handleNavigate} onLogout={handleLogout} />} />
        <Route path="/support" element={<SupportTicketsPage isAuthenticated={isAuthenticated} onNavigate={handleNavigate} onLogout={handleLogout} />} />
        <Route path="/support/new" element={<CreateSupportTicketPage isAuthenticated={isAuthenticated} onNavigate={handleNavigate} onLogout={handleLogout} />} />
        <Route path="/support/:id" element={<SupportTicketDetailsPage isAuthenticated={isAuthenticated} onNavigate={handleNavigate} onLogout={handleLogout} />} />

        {/* Admin */}
        <Route path="/admin/support" element={<AdminDashboard onNavigate={handleNavigate} />} />
        <Route path="/admin/support/:ticketId" element={<AdminDashboard onNavigate={handleNavigate} />} />
        <Route path="/admin" element={<AdminDashboard onNavigate={handleNavigate} />} />
      </Routes>
      
      {shouldShowFooter && <Footer />}
    </Suspense>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;

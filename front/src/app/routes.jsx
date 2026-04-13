import React, { Suspense, useCallback, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";

import { clearAuthSession, getStoredToken } from "@/shared/utils/authStorage.js";

const Home = React.lazy(() => import("@/modules/campaigns/pages/Home.jsx"));
const SignIn = React.lazy(() => import("@/modules/auth/pages/SignIn.jsx"));
const SignUp = React.lazy(() => import("@/modules/auth/pages/SignUp.jsx"));
const GoogleAuthCallback = React.lazy(() => import("@/modules/auth/pages/GoogleAuthCallback.jsx"));
const ForgotPassword = React.lazy(() => import("@/modules/auth/pages/ForgotPassword.jsx"));
const Settings = React.lazy(() => import("@/modules/profile/pages/Settings.jsx"));
const Profile = React.lazy(() => import("@/modules/profile/pages/Profile.jsx"));
const SavedProjects = React.lazy(() => import("@/modules/campaigns/pages/SavedProjects.jsx"));
const ProjectDetails = React.lazy(() => import("@/modules/campaigns/pages/ProjectDetails.jsx"));
const Discover = React.lazy(() => import("@/modules/campaigns/pages/Discover.jsx"));
const StartProject = React.lazy(() => import("@/modules/campaigns/pages/StartProject.jsx"));
const CreateProjectStep1 = React.lazy(() => import("@/modules/campaigns/pages/CreateProjectStep1.jsx"));
const CreateProjectStep2 = React.lazy(() => import("@/modules/campaigns/pages/CreateProjectStep2.jsx"));
const CreateProjectStep3 = React.lazy(() => import("@/modules/campaigns/pages/CreateProjectStep3.jsx"));
const ProjectEditor = React.lazy(() => import("@/modules/campaigns/pages/ProjectEditor.jsx"));
const AdminDashboard = React.lazy(() => import("@/modules/admin/pages/AdminDashboard.jsx"));
const DonationPage = React.lazy(() => import("@/modules/payments/pages/DonationPage.jsx"));
const SupportTicketsPage = React.lazy(() => import("@/modules/support/pages/SupportTicketsPage.jsx"));
const CreateSupportTicketPage = React.lazy(() => import("@/modules/support/pages/CreateSupportTicketPage.jsx"));
const SupportTicketDetailsPage = React.lazy(() => import("@/modules/support/pages/SupportTicketDetailsPage.jsx"));
const Footer = React.lazy(() => import("@/shared/components/Footer.jsx"));

function AppRoutes() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!getStoredToken());
  const [signInMessage, setSignInMessage] = useState("");

  const hideFooterRoutes = [
    "/login",
    "/register",
    "/auth/google/callback",
    "/forgot-password",
    "/create/",
    "/editor",
    "/admin",
    "/support",
  ];

  const shouldShowFooter =
    !hideFooterRoutes.some((path) => location.pathname.startsWith(path)) &&
    !location.pathname.endsWith("/soutenir");

  const [draftProject, setDraftProject] = useState({
    category: "",
    title: "",
    subtitle: "",
    goal: "",
    image_url: "",
    video_url: "",
    rewards: [],
    story: {
      blocks: [],
      risks: "",
      faqs: [],
    },
    campaignId: null,
  });

  const handleSaveDraft = useCallback((data) => {
    setDraftProject((prev) => ({ ...prev, ...data }));
  }, []);

  const handleNavigate = (view, payload = "") => {
    if (view === "signIn" && payload) setSignInMessage(payload);

    if (view === "projectDetails") {
      const campaignId = typeof payload === "object" ? payload?.id : payload;
      navigate(campaignId ? `/project/${campaignId}` : "/project");
      return;
    }

    if (view === "donationPage") {
      const campaignId = typeof payload === "object" ? payload?.id : payload;
      navigate(campaignId ? `/project/${campaignId}?support=1` : "/discover");
      return;
    }

    if (view === "projectEditor") {
      const campaignId = typeof payload === "object" ? payload?.id : payload;
      navigate(campaignId ? `/editor/${campaignId}` : "/editor");
      return;
    }

    const routeMap = {
      home: "/",
      signIn: "/login",
      signUp: "/register",
      forgotPassword: "/forgot-password",
      settings: "/settings",
      profile: "/profile",
      saved: "/saved",
      discover: "/discover",
      startProject: "/start",
      createProjectStep1: "/create/step1",
      createProjectStep2: "/create/step2",
      createProjectStep3: "/create/step3",
      support: "/support",
      newSupportTicket: "/support/new",
      adminDashboard: "/admin",
    };

    navigate(routeMap[view] || "/");
  };

  const handleLogout = () => {
    clearAuthSession();
    setIsAuthenticated(false);
    navigate("/");
  };

  return (
    <Suspense
      fallback={
        <div
          style={{
            display: "flex",
            height: "100vh",
            justifyContent: "center",
            alignItems: "center",
            color: "#0ce688",
            backgroundColor: "#0b0f19",
          }}
        >
          Chargement...
        </div>
      }
    >
      <Routes>
        <Route
          path="/"
          element={<Home isAuthenticated={isAuthenticated} onNavigate={handleNavigate} onLogout={handleLogout} />}
        />
        <Route
          path="/login"
          element={
            <SignIn
              message={signInMessage}
              onSwitch={() => {
                setSignInMessage("");
                navigate("/register");
              }}
              onForgotPassword={() => navigate("/forgot-password")}
              onHome={() => navigate("/")}
              onLoginSuccess={(_token, user) => {
                setIsAuthenticated(true);
                setSignInMessage("");
                navigate(user.role === "ADMIN" ? "/admin" : "/");
              }}
            />
          }
        />
        <Route path="/register" element={<SignUp onSwitch={() => navigate("/login")} onHome={() => navigate("/")} />} />
        <Route
          path="/auth/google/callback"
          element={
            <GoogleAuthCallback
              onAuthSuccess={(_token, user) => {
                setIsAuthenticated(true);
                setSignInMessage("");
                navigate(user.role === "ADMIN" ? "/admin" : "/");
              }}
            />
          }
        />
        <Route
          path="/forgot-password"
          element={<ForgotPassword onSwitch={() => navigate("/login")} onHome={() => navigate("/")} />}
        />
        <Route
          path="/discover"
          element={<Discover isAuthenticated={isAuthenticated} onNavigate={handleNavigate} onLogout={handleLogout} />}
        />
        <Route
          path="/project"
          element={
            <ProjectDetails
              isAuthenticated={isAuthenticated}
              onNavigate={handleNavigate}
              onLogout={handleLogout}
              onLoginSuccess={() => setIsAuthenticated(true)}
            />
          }
        />
        <Route
          path="/project/:id"
          element={
            <ProjectDetails
              isAuthenticated={isAuthenticated}
              onNavigate={handleNavigate}
              onLogout={handleLogout}
              onLoginSuccess={() => setIsAuthenticated(true)}
            />
          }
        />
        <Route
          path="/project/:id/soutenir"
          element={
            <DonationPage
              isAuthenticated={isAuthenticated}
              onNavigate={handleNavigate}
              onLogout={handleLogout}
              onLoginSuccess={() => setIsAuthenticated(true)}
            />
          }
        />
        <Route
          path="/start"
          element={<StartProject isAuthenticated={isAuthenticated} onNavigate={handleNavigate} onLogout={handleLogout} />}
        />
        <Route
          path="/create/step1"
          element={<CreateProjectStep1 onNavigate={handleNavigate} onSaveDraft={handleSaveDraft} draftProject={draftProject} />}
        />
        <Route path="/create/step2" element={<CreateProjectStep2 onNavigate={handleNavigate} />} />
        <Route
          path="/create/step3"
          element={<CreateProjectStep3 onNavigate={handleNavigate} onSaveDraft={handleSaveDraft} draftProject={draftProject} />}
        />
        <Route
          path="/editor/:id?"
          element={<ProjectEditor onNavigate={handleNavigate} draftProject={draftProject} onSaveDraft={handleSaveDraft} />}
        />
        <Route
          path="/settings"
          element={<Settings isAuthenticated={isAuthenticated} onNavigate={handleNavigate} onLogout={handleLogout} />}
        />
        <Route
          path="/profile"
          element={<Profile isAuthenticated={isAuthenticated} onNavigate={handleNavigate} onLogout={handleLogout} />}
        />
        <Route
          path="/saved"
          element={<SavedProjects isAuthenticated={isAuthenticated} onNavigate={handleNavigate} onLogout={handleLogout} />}
        />
        <Route
          path="/support"
          element={<SupportTicketsPage isAuthenticated={isAuthenticated} onNavigate={handleNavigate} onLogout={handleLogout} />}
        />
        <Route
          path="/support/new"
          element={<CreateSupportTicketPage isAuthenticated={isAuthenticated} onNavigate={handleNavigate} onLogout={handleLogout} />}
        />
        <Route
          path="/support/:id"
          element={<SupportTicketDetailsPage isAuthenticated={isAuthenticated} onNavigate={handleNavigate} onLogout={handleLogout} />}
        />
        <Route path="/admin/support" element={<AdminDashboard onNavigate={handleNavigate} />} />
        <Route path="/admin/support/:ticketId" element={<AdminDashboard onNavigate={handleNavigate} />} />
        <Route path="/admin" element={<AdminDashboard onNavigate={handleNavigate} />} />
      </Routes>

      {shouldShowFooter && <Footer />}
    </Suspense>
  );
}

export default AppRoutes;

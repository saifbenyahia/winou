import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Navbar from "./Navbar";
import "./ProjectDetails.css";

const DonationPage = ({ onNavigate, isAuthenticated, onLogout }) => {
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) {
      navigate("/discover", { replace: true });
      return;
    }

    navigate(`/project/${id}?support=1`, { replace: true });
  }, [id, navigate]);

  return (
    <div className="project-details-wrapper">
      <Navbar onNavigate={onNavigate} isAuthenticated={isAuthenticated} onLogout={onLogout} activeTab="projectDetails" />
      <div className="pd-main" style={{ textAlign: "center", paddingTop: "120px" }}>
        <h1 className="pd-title" style={{ fontSize: "32px" }}>Redirection vers la campagne...</h1>
      </div>
    </div>
  );
};

export default DonationPage;

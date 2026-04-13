import React from "react";

import {
  getCategoryLabel,
  getPriorityMeta,
  getStatusMeta,
} from "../../modules/support/utils/supportUtils.js";
import "./SupportBadges.css";

export const SupportStatusBadge = ({ status }) => {
  const meta = getStatusMeta(status);

  return (
    <span className={`support-badge support-badge--status ${meta.className}`}>
      {meta.label}
    </span>
  );
};

export const SupportPriorityBadge = ({ priority }) => {
  const meta = getPriorityMeta(priority);

  return (
    <span className={`support-badge support-badge--priority ${meta.className}`}>
      {meta.label}
    </span>
  );
};

export const SupportCategoryBadge = ({ category }) => (
  <span className="support-badge support-badge--category">
    {getCategoryLabel(category)}
  </span>
);

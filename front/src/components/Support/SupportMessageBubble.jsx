import React from "react";

import {
  formatSupportDate,
  getInitials,
  resolveMediaUrl,
} from "../../modules/support/utils/supportUtils.js";
import "./SupportMessageBubble.css";

const SupportMessageBubble = ({
  message,
  isOwnMessage = false,
}) => {
  const attachmentUrl = resolveMediaUrl(message.attachment_url);

  return (
    <article className={`support-message-bubble ${isOwnMessage ? "is-own" : ""} ${message.sender_role === "ADMIN" ? "is-admin" : "is-user"}`}>
      <div className="support-message-bubble__avatar">
        {getInitials(message.sender_name)}
      </div>

      <div className="support-message-bubble__body">
        <div className="support-message-bubble__meta">
          <strong>{message.sender_name}</strong>
          <span>{message.sender_role === "ADMIN" ? "Support" : "Client"}</span>
          <time>{formatSupportDate(message.created_at)}</time>
        </div>

        <div className="support-message-bubble__content">
          <p>{message.message}</p>

          {attachmentUrl && (
            <a
              className="support-message-bubble__attachment"
              href={attachmentUrl}
              target="_blank"
              rel="noreferrer"
            >
              Ouvrir la piece jointe
              {message.attachment_name ? ` - ${message.attachment_name}` : ""}
            </a>
          )}
        </div>
      </div>
    </article>
  );
};

export default SupportMessageBubble;

import React from 'react';

interface TypingIndicatorProps {
  agentName?: string;
}

export function TypingIndicator({ agentName = 'Agent' }: TypingIndicatorProps) {
  return (
    <div className="typingIndicator">
      <div className="typingContainer">
        <div className="senderName">{agentName}</div>
        <div className="typingBubble">
          <span className="dot" />
          <span className="dot" />
          <span className="dot" />
        </div>
      </div>
    </div>
  );
}

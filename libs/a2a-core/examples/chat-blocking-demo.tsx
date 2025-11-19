import React from 'react';
import { ChatWidget } from '@microsoft/logicAppsChat/react';

/**
 * Demo showcasing the chat blocking features:
 * 1. Chat input is disabled while messages are streaming
 * 2. Chat input is disabled while authentication is required
 * 3. Authentication can be canceled to re-enable chat
 */
export function ChatBlockingDemo() {
  return (
    <div style={{ height: '600px', width: '400px' }}>
      <ChatWidget
        agentCard="https://your-agent.example.com/agent-card.json"
        welcomeMessage="Welcome! Chat will be disabled during streaming and authentication."
        auth={{
          type: 'bearer',
          token: 'your-token-here',
        }}
        onAuthRequired={(event) => {
          console.log('Authentication required:', event);
          // The chat input will be automatically disabled
        }}
        onUnauthorized={(event) => {
          console.log('Unauthorized:', event);
        }}
      />
    </div>
  );
}

/**
 * Key behaviors:
 *
 * 1. During message streaming:
 *    - Input field is disabled
 *    - Send button is disabled
 *    - Status shows "Agent is typing..."
 *
 * 2. During authentication:
 *    - Input field is disabled
 *    - Send button is disabled
 *    - Status shows "Authentication in progress..."
 *    - Cancel button appears in auth message
 *
 * 3. After authentication completes or is canceled:
 *    - Input field is re-enabled
 *    - Send button is re-enabled (if message exists)
 *    - Status message disappears
 */

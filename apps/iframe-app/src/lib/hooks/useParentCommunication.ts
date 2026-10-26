import { useState, useEffect, useCallback } from 'react';
import { getAllowedOrigins, isOriginAllowed, getParentOrigin } from '../utils/origin-validator';
import { validateAgentCardPayload, type AgentCardPayload } from '../utils/config-parser';

interface UseParentCommunicationOptions {
  enabled: boolean;
  trustedParentOrigin?: string;
  onAgentCardReceived?: (agentCard: AgentCardPayload) => void;
}

interface UseParentCommunicationResult {
  isWaitingForAgentCard: boolean;
  sendMessageToParent: (message: unknown, targetOrigin?: string) => void;
}

interface SetAgentCardMessage {
  type: 'SET_AGENT_CARD';
  agentCard?: unknown;
}

function isSetAgentCardMessage(data: unknown): data is SetAgentCardMessage {
  return typeof data === 'object' && data !== null && 'type' in data && data.type === 'SET_AGENT_CARD';
}

/**
 * Custom hook to handle postMessage communication with parent window
 * Used for receiving agent card configuration and other messages
 */
export function useParentCommunication({
  enabled,
  trustedParentOrigin,
  onAgentCardReceived,
}: UseParentCommunicationOptions): UseParentCommunicationResult {
  const [isWaitingForAgentCard, setIsWaitingForAgentCard] = useState(enabled);

  // Send message to parent window
  const sendMessageToParent = useCallback(
    (message: unknown, targetOrigin?: string) => {
      if (window.parent === window) {
        return; // Not in iframe
      }

      const origin = targetOrigin || getParentOrigin(trustedParentOrigin);
      window.parent.postMessage(message, origin);
    },
    [trustedParentOrigin]
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const allowedOrigins = getAllowedOrigins(trustedParentOrigin);

    const handleMessage = (event: MessageEvent) => {
      if (!isSetAgentCardMessage(event.data)) {
        return;
      }

      if (event.source !== window.parent) {
        console.warn('Ignoring SET_AGENT_CARD message from an unexpected source.');
        return;
      }

      if (!isOriginAllowed(event.origin, allowedOrigins)) {
        console.warn('Ignoring SET_AGENT_CARD message from an untrusted origin:', event.origin);
        return;
      }

      let agentCard: AgentCardPayload;
      try {
        agentCard = validateAgentCardPayload(event.data.agentCard);
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'Unknown validation error';
        console.warn('Ignoring SET_AGENT_CARD message with an invalid agent card:', reason);
        return;
      }

      if (onAgentCardReceived) {
        onAgentCardReceived(agentCard);
      }
      setIsWaitingForAgentCard(false);
      window.parent.postMessage({ type: 'AGENT_CARD_RECEIVED' }, event.origin);
    };

    window.addEventListener('message', handleMessage);

    // Send ready signal to parent
    sendMessageToParent({ type: 'IFRAME_READY' });

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [enabled, trustedParentOrigin, onAgentCardReceived, sendMessageToParent]);

  return {
    isWaitingForAgentCard,
    sendMessageToParent,
  };
}

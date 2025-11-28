import { useState, useEffect, useCallback } from 'react';
import { getAllowedOrigins, isOriginAllowed, getParentOrigin } from '../utils/origin-validator';

interface UseParentCommunicationOptions {
  enabled: boolean;
  onAgentCardReceived?: (agentCard: any) => void;
}

interface UseParentCommunicationResult {
  isWaitingForAgentCard: boolean;
  sendMessageToParent: (message: any, targetOrigin?: string) => void;
}

/**
 * Custom hook to handle postMessage communication with parent window
 * Used for receiving agent card configuration and other messages
 */
export function useParentCommunication({
  enabled,
  onAgentCardReceived,
}: UseParentCommunicationOptions): UseParentCommunicationResult {
  const [isWaitingForAgentCard, setIsWaitingForAgentCard] = useState(enabled);

  // Send message to parent window
  const sendMessageToParent = useCallback((message: any, targetOrigin?: string) => {
    if (window.parent === window) {
      return; // Not in iframe
    }

    const origin = targetOrigin || getParentOrigin();
    window.parent.postMessage(message, origin);
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const allowedOrigins = getAllowedOrigins();

    const handleMessage = (event: MessageEvent) => {
      // Verify origin
      if (!isOriginAllowed(event.origin, allowedOrigins)) {
        console.warn('Ignoring message from untrusted origin:', event.origin);
        return;
      }

      // Handle SET_AGENT_CARD message
      if (event.data && event.data.type === 'SET_AGENT_CARD') {
        if (onAgentCardReceived) {
          onAgentCardReceived(event.data.agentCard);
        }
        setIsWaitingForAgentCard(false);

        // Send acknowledgment
        if (event.source && typeof event.source.postMessage === 'function') {
          event.source.postMessage({ type: 'AGENT_CARD_RECEIVED' }, event.origin as any);
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // Send ready signal to parent
    sendMessageToParent({ type: 'IFRAME_READY' });

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [enabled, onAgentCardReceived, sendMessageToParent]);

  return {
    isWaitingForAgentCard,
    sendMessageToParent,
  };
}

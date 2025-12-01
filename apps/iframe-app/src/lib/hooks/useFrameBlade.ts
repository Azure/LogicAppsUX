import { useState, useEffect, useCallback, useRef } from 'react';
import type { ChatHistoryData } from '../types/chat-history';

const FRAME_SIGNATURE = 'FxFrameBlade';

export interface FrameBladeMessage {
  signature: string;
  kind: string;
  data?: any;
  messageType?: string;
  value?: any;
  sessionId?: string;
}

interface UseFrameBladeOptions {
  enabled: boolean;
  trustedParentOrigin?: string;
  onThemeChange?: (theme: 'light' | 'dark') => void;
  onAuthTokenReceived?: (token: string) => void;
  onChatHistoryReceived?: (history: ChatHistoryData) => void;
}

interface UseFrameBladeResult {
  isReady: boolean;
  sendMessage: (kind: string, data?: any) => void;
}

/**
 * Custom hook to handle Frame Blade (Azure Portal) integration
 * Manages bidirectional communication with the portal iframe
 */
export function useFrameBlade({
  enabled,
  trustedParentOrigin,
  onThemeChange,
  onAuthTokenReceived,
  onChatHistoryReceived,
}: UseFrameBladeOptions): UseFrameBladeResult {
  const [isReady, setIsReady] = useState(!enabled);
  const sessionIdRef = useRef<string>('');

  // Extract session ID from URL hash
  useEffect(() => {
    if (enabled) {
      sessionIdRef.current = location.hash.substr(1);
      if (!sessionIdRef.current) {
        console.warn('No Frame Blade session ID found in URL hash');
      }
    }
  }, [enabled]);

  // Send message to parent
  const sendMessage = useCallback(
    (kind: string, data?: any) => {
      if (!enabled || !trustedParentOrigin) {
        console.warn('Cannot send Frame Blade message - not enabled or no trusted origin', {
          enabled,
          trustedParentOrigin,
        });
        return;
      }

      const message = {
        signature: FRAME_SIGNATURE,
        kind,
        data,
        sessionId: sessionIdRef.current,
      };

      console.log('Sending Frame Blade message:', message);
      window.parent.postMessage(message, trustedParentOrigin);
    },
    [enabled, trustedParentOrigin]
  );

  // Handle incoming messages
  useEffect(() => {
    if (!enabled || !trustedParentOrigin) {
      return;
    }

    const handleMessage = (evt: MessageEvent) => {
      // Only accept messages from trusted origin
      if (evt.origin.toLowerCase() !== trustedParentOrigin.toLowerCase()) {
        return;
      }

      const msg = evt.data as FrameBladeMessage;

      // Check for Frame Blade signature
      if (msg.signature !== FRAME_SIGNATURE) {
        return;
      }

      switch (msg.kind) {
        case 'themeChanged':
          // Handle theme changes
          if (msg.data) {
            // msg.data is the theme string directly
            const newTheme = msg.data === 'dark' ? 'dark' : 'light';
            onThemeChange?.(newTheme);

            // Apply Frame Blade theme class to body
            document.body.className = document.body.className.replace(/fxs-theme-\w+/g, '');
            document.body.classList.add(`fxs-theme-${newTheme}`);
          }
          break;

        case 'authToken':
          if (msg.data && onAuthTokenReceived) {
            onAuthTokenReceived(msg.data);
          }
          break;

        case 'chatHistory':
          // Handle chat history data from parent blade
          if (msg.data && onChatHistoryReceived) {
            console.log('Received chat history from parent blade');
            onChatHistoryReceived(msg.data as ChatHistoryData);
          }
          break;

        case 'frametitle':
          // Set the document title and reveal content
          if (msg.data) {
            document.title = msg.data;
            sendMessage('revealcontent');
          }
          break;

        case 'framecontent':
          // Just acknowledge frame content
          sendMessage('revealcontent');
          break;

        default:
          // Handle custom messages from portal (e.g., message type from extension)
          if (msg.messageType) {
            console.log('Frame Blade custom message:', msg);
            // Here you can handle custom messages like opening blades, etc.
            // For example, if you need to handle blade navigation:
            // if (msg.messageType === 'OpenBlade') {
            //   postMessageToParent('OpenBlade', msg.value);
            // }
          } else {
            console.log('Unknown Frame Blade message:', msg);
          }
      }
    };

    window.addEventListener('message', handleMessage);

    // Send ready message
    console.log('Sending Frame Blade ready message to:', trustedParentOrigin);
    sendMessage('ready');

    // Signal initialization complete after delay
    const timer = setTimeout(() => {
      console.log('Sending Frame Blade initializationcomplete message');
      sendMessage('initializationcomplete');
      setIsReady(true);
    }, 100);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(timer);
    };
  }, [
    enabled,
    trustedParentOrigin,
    sendMessage,
    onThemeChange,
    onAuthTokenReceived,
    onChatHistoryReceived,
  ]);

  return {
    isReady,
    sendMessage,
  };
}

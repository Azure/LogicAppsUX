import {  useEffect, useCallback, useRef } from 'react';
import type { AuthPopupResult } from '@microsoft/logic-apps-chat';

/**
 * Message types for VS Code communication
 */
export interface VSCodeAuthPopupMessage {
  type: 'VSCODE_OPEN_AUTH_POPUP';
  data: {
    url: string;
    index: number;
    requestId: string;
  };
}

export interface VSCodeAuthPopupResultMessage {
  type: 'VSCODE_AUTH_POPUP_RESULT';
  data: {
    requestId: string;
    success: boolean;
    error?: string;
  };
}

interface UseVSCodeCommunicationOptions {
  enabled: boolean;
}

interface UseVSCodeCommunicationResult {
  /**
   * Opens an auth popup via VS Code extension.
   * Returns a promise that resolves when the popup completes.
   */
  openAuthPopup: (url: string, index: number) => Promise<AuthPopupResult>;
  /**
   * Sends a message to the parent window (VS Code webview)
   */
  sendMessageToParent: (message: any) => void;
}

/**
 * Custom hook to handle VS Code webview communication for authentication popups.
 * When running in VS Code context (inVSCode=true), this hook provides a way to
 * delegate popup opening to the VS Code extension, which can use vscode.env.openExternal().
 */
export function useVSCodeCommunication({ enabled }: UseVSCodeCommunicationOptions): UseVSCodeCommunicationResult {
  // Track pending auth requests
  const pendingRequests = useRef<Map<string, { resolve: (result: AuthPopupResult) => void }>>(new Map());
  const requestIdCounter = useRef(0);

  // Send message to parent window
  const sendMessageToParent = useCallback(
    (message: any) => {
      if (!enabled) {
        console.warn('[useVSCodeCommunication] Not enabled, cannot send message');
        return;
      }

      if (window.parent === window) {
        console.warn('[useVSCodeCommunication] Not in iframe, cannot send message');
        return;
      }

      // Send to parent with wildcard origin (VS Code webview handles security)
      window.parent.postMessage(message, '*');
    },
    [enabled]
  );

  // Handle incoming messages from VS Code
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      // Handle auth popup result
      if (message && message.type === 'VSCODE_AUTH_POPUP_RESULT') {
        const { requestId, success, error } = message.data as VSCodeAuthPopupResultMessage['data'];

        const pending = pendingRequests.current.get(requestId);
        if (pending) {
          pending.resolve({ success, error });
          pendingRequests.current.delete(requestId);
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // Notify parent that iframe is ready for VS Code communication
    sendMessageToParent({ type: 'VSCODE_IFRAME_READY' });

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [enabled, sendMessageToParent]);

  // Open auth popup via VS Code
  const openAuthPopup = useCallback(
    async (url: string, index: number): Promise<AuthPopupResult> => {
      if (!enabled) {
        return { success: false, error: 'VS Code communication not enabled' };
      }

      const requestId = `auth-popup-${++requestIdCounter.current}-${Date.now()}`;

      return new Promise<AuthPopupResult>((resolve) => {
        // Store the pending request
        pendingRequests.current.set(requestId, { resolve });

        // Set a timeout to prevent hanging forever
        const timeoutId = setTimeout(() => {
          if (pendingRequests.current.has(requestId)) {
            pendingRequests.current.delete(requestId);
            resolve({ success: false, error: 'Authentication timed out' });
          }
        }, 10 * 60 * 1000); // 10 minutes timeout

        // Update pending request to also clear timeout on resolve
        const originalResolve = pendingRequests.current.get(requestId)!.resolve;
        pendingRequests.current.set(requestId, {
          resolve: (result) => {
            clearTimeout(timeoutId);
            originalResolve(result);
          },
        });

        // Send message to VS Code
        const message: VSCodeAuthPopupMessage = {
          type: 'VSCODE_OPEN_AUTH_POPUP',
          data: { url, index, requestId },
        };

        console.log('[useVSCodeCommunication] Sending auth popup request:', message);
        sendMessageToParent(message);
      });
    },
    [enabled, sendMessageToParent]
  );

  return {
    openAuthPopup,
    sendMessageToParent,
  };
}

/**
 * Example implementation of On-Behalf-Of (OBO) authentication flow
 * This demonstrates how to handle authentication requests during A2A streaming
 */

// Example imports you would use:
// import { A2AClient } from '@microsoft/logicAppsChat';
// import { openPopupWindow } from '@microsoft/logicAppsChat';
// import type { AuthRequiredEvent, AuthRequiredHandler } from '@microsoft/logicAppsChat';
// import type { AgentCard } from '@microsoft/logicAppsChat';

// Create an auth handler that opens the consent link in a popup
// Example handler shown for documentation purposes
/*
const handleAuthRequired: AuthRequiredHandler = async (event: AuthRequiredEvent) => {
  console.log('Authentication required for task:', event.taskId);
  
  // Handle multiple auth parts
  for (const authPart of event.authParts) {
    console.log('Opening consent URL in popup:', authPart.consentLink);

    try {
      // Open the consent link in a popup window
      const result = await openPopupWindow(authPart.consentLink, 'a2a-auth-consent', {
        width: 800,
        height: 600,
      });

      if (result.closed) {
        console.log('Authentication popup closed');

        if (result.error) {
          console.error('Authentication error:', result.error);
          throw result.error;
        }

        // The popup was closed successfully - authentication should be complete
        console.log('Authentication completed successfully');
      }
    } catch (error) {
      console.error('Failed to handle authentication:', error);
      throw error;
    }
  }
};
*/

// Example usage in a React component
export function ExampleOBOComponent() {
  // This is just an example showing how to use the auth handler
  /*
  const handleConnect = async (agentCard: AgentCard) => {
    // Create client with auth handler
    const client = new A2AClient({
      agentCard,
      onAuthRequired: handleAuthRequired,
    });

    // Send a message that might require authentication
    const messageRequest = {
      message: {
        role: 'user' as const,
        content: [
          {
            type: 'text' as const,
            content: 'Please perform an action that requires authentication',
          },
        ],
      },
    };

    try {
      // Start streaming - authentication might be required during the stream
      for await (const task of client.message.stream(messageRequest)) {
        console.log('Task update:', task);

        // The auth handler will be called automatically if authentication is required
        // After the popup closes, you need to send the authentication completed message

        // Check if we have a context ID (this would be set by the streaming response)
        if ((task as any).contextId) {
          // In a real implementation, you would track whether auth was just completed
          // and only send this message once after the popup closes
          // This is just for demonstration purposes
          // Send authentication completed message to resume the stream
          // await client.sendAuthenticationCompleted((task as any).contextId);
        }
      }
    } catch (error) {
      console.error('Streaming error:', error);
    }
  };
  */

  return null; // This is just an example, not a real component
}

// Example usage with React hooks
import { useA2A } from '../react/use-a2a';
import { openPopupWindow } from '../utils/popup-window';
import { A2AClient } from '../client/a2a-client';

export function ExampleWithHooks() {
  // Using the useA2A hook with auth handler
  const { sendAuthenticationCompleted } = useA2A({
    onAuthRequired: async (event) => {
      console.log('Auth required in React hook:', event);

      try {
        // Handle multiple auth parts
        for (const authPart of event.authParts) {
          // Open popup
          const result = await openPopupWindow(authPart.consentLink);

          if (result.closed && !result.error) {
            console.log(`Authentication completed for ${authPart.serviceName}`);
          } else {
            throw new Error(`Authentication failed for ${authPart.serviceName}`);
          }
        }

        // After all auth parts are completed, send the completion message
        await sendAuthenticationCompleted();
      } catch (error) {
        console.error('Auth handler error:', error);
      }
    },
  });

  // Rest of your component logic...
  return null;
}

// Example with manual popup handling and completion message
export async function manualAuthFlow(client: A2AClient, contextId: string, taskId: string) {
  // This would be called after receiving an auth-required event
  const consentUrl = 'https://example.com/consent'; // From the auth event

  try {
    // 1. Open popup for user consent
    const popupResult = await openPopupWindow(consentUrl, 'consent-window');

    // 2. Check if authentication was successful
    if (popupResult.closed && !popupResult.error) {
      // 3. Send authentication completed message
      // This sends a regular user message with a data part containing { messageType: 'AuthenticationCompleted' }
      // It uses the same SSE streaming as normal messages with the taskId from the auth event
      await client.sendAuthenticationCompleted(contextId, taskId);
      console.log('Authentication flow completed, server will resume the original task');
    } else {
      throw new Error('Authentication was cancelled or failed');
    }
  } catch (error) {
    console.error('Authentication flow failed:', error);
    throw error;
  }
}

// Note about the authentication completed message:
// The sendAuthenticationCompleted method sends a user message that gets transformed to:
// {
//   "jsonrpc": "2.0",
//   "method": "message/stream",
//   "params": {
//     "message": {
//       "kind": "message",
//       "messageId": "...",
//       "role": "user",
//       "parts": [{
//         "kind": "data",
//         "data": {
//           "messageType": "AuthenticationCompleted"
//         }
//       }],
//       "taskId": "...",  // The taskId from the auth-required event
//       "contextId": "..."
//     },
//     "configuration": {
//       "acceptedOutputModes": ["text"]
//     }
//   },
//   "id": ...
// }
// This is sent through the standard message.stream() method using SSE

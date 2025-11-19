import React from 'react';
import {
  ChatWidget,
  ChatWindow,
  useChatWidget,
  AuthenticationMessage,
  useChatStore,
} from '../react';
import type { AuthRequiredEvent } from '../client/types';

/**
 * Example 1: Using ChatWidget with default authentication UI
 *
 * The ChatWidget automatically shows an authentication UI when OBO auth is required.
 * No additional configuration needed - just use the widget as normal.
 */
export function ChatWithDefaultAuth() {
  return (
    <ChatWidget
      agentCard="https://example.com/agent-card"
      welcomeMessage="Hello! I may need you to authenticate with external services for certain actions."
    />
  );
}

/**
 * Example 2: Using ChatWidget with custom auth handler
 *
 * You can override the default behavior by providing your own auth handler.
 * The built-in UI will not show if you provide a custom handler.
 */
export function ChatWithCustomAuthHandler() {
  // Example showing how you would create a custom auth handler
  // const handleAuthRequired = async (event: AuthRequiredEvent) => {
  //   console.log('Authentication required:', event);
  //
  //   // Custom logic - maybe show a modal or redirect
  //   for (const authPart of event.authParts) {
  //     console.log(`Need auth for: ${authPart.serviceName}`);
  //     // Your custom authentication flow here
  //     // For example, you might want to show your own UI or handle auth differently
  //   }
  // };

  return (
    <ChatWidget
      agentCard="https://example.com/agent-card"
      // Custom auth handler - note this isn't supported yet in ChatWidget
      // You would need to use useChatWidget hook for custom handlers
    />
  );
}

/**
 * Example 3: Using the low-level hook with built-in auth UI
 *
 * The useChatWidget hook automatically handles auth events and updates the store.
 * The ChatWindow component will show the authentication UI when needed.
 */
export function CustomChatImplementation() {
  const chatWidget = useChatWidget({
    agentCard: 'https://example.com/agent-card',
    // No onAuthRequired provided - uses default behavior
  });

  return (
    <div style={{ height: '600px', width: '100%' }}>
      <ChatWindow {...chatWidget} agentCard="https://example.com/agent-card" />
    </div>
  );
}

/**
 * Example 4: Manually handling authentication UI
 *
 * You can also manually render the AuthenticationMessage component
 * when you detect an auth event.
 */
export function ManualAuthUIExample() {
  const [authEvent, setAuthEvent] = React.useState<AuthRequiredEvent | null>(null);

  const chatWidget = useChatWidget({
    agentCard: 'https://example.com/agent-card',
    onAuthRequired: (event) => {
      // Store the event to show our own UI
      setAuthEvent(event);
    },
  });

  const handleAuthCompleted = async () => {
    try {
      // Send the authentication completed message
      await chatWidget.handleAuthCompleted();
      // Clear the auth event
      setAuthEvent(null);
    } catch (error) {
      console.error('Failed to complete authentication:', error);
    }
  };

  return (
    <div style={{ height: '600px', width: '100%' }}>
      <ChatWindow {...chatWidget} agentCard="https://example.com/agent-card" />

      {authEvent && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
          }}
        >
          <AuthenticationMessage
            authParts={authEvent.authParts}
            status="pending"
            onAuthenticate={handleAuthCompleted}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Example 5: Accessing auth state from the store
 *
 * You can also access the authentication state directly from the store
 * for more advanced use cases.
 */
// useChatStore is already imported at the top

export function AuthStateExample() {
  const { authRequired, setAuthRequired } = useChatStore();

  const chatWidget = useChatWidget({
    agentCard: 'https://example.com/agent-card',
  });

  React.useEffect(() => {
    if (authRequired) {
      console.log(
        'Auth required for services:',
        authRequired.authParts.map((p) => p.serviceName)
      );
      // You could show a notification, log analytics, etc.
    }
  }, [authRequired]);

  const handleClearAuth = () => {
    setAuthRequired(null);
  };

  return (
    <div>
      <ChatWindow {...chatWidget} agentCard="https://example.com/agent-card" />

      {authRequired && (
        <div style={{ padding: '10px', background: '#fffbeb' }}>
          Authentication is required for {authRequired.authParts.length} service(s).
          <button onClick={handleClearAuth}>Dismiss</button>
        </div>
      )}
    </div>
  );
}

/**
 * Key Points:
 *
 * 1. By default, ChatWidget and ChatWindow show a built-in authentication UI
 * 2. The UI handles multiple authentication requirements (multiple services)
 * 3. Users must authenticate with ALL required services before continuing
 * 4. The authentication state is managed in the chat store
 * 5. You can override the default behavior with a custom onAuthRequired handler
 * 6. The UI is styled to match your chat theme automatically
 *
 * The authentication flow:
 * 1. Server sends auth-required message during streaming
 * 2. Default handler sets authRequired in the store
 * 3. MessageList renders AuthenticationMessage component
 * 4. User clicks "Sign In" for each service
 * 5. Popup windows open for consent
 * 6. After all services authenticated, onAllAuthenticated is called
 * 7. This sends the AuthenticationCompleted message
 * 8. Server resumes the original task
 */

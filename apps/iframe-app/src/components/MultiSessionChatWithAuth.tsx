import { MultiSessionChat } from './MultiSessionChat';
import { SessionExpiredModal } from './SessionExpiredModal';
import { useSessionExpiredHandler } from '../hooks/useSessionExpiredHandler';
import type { ChatWidgetProps } from '@microsoft/logicAppsChat';

interface MultiSessionChatWithAuthProps extends Omit<ChatWidgetProps, 'agentCard'> {
  apiUrl: string;
  apiKey?: string;
  mode?: 'light' | 'dark';
}

/**
 * Example wrapper component that shows how to handle session expiration
 * with a modal when a 302 redirect is detected.
 */
export function MultiSessionChatWithAuth({
  apiUrl,
  apiKey,
  mode = 'light',
  ...chatWidgetProps
}: MultiSessionChatWithAuthProps) {
  const { isSessionExpired, handleUnauthorized } = useSessionExpiredHandler();

  return (
    <>
      <MultiSessionChat
        config={{
          apiUrl,
          apiKey,
          onUnauthorized: () =>
            handleUnauthorized({
              url: apiUrl,
              method: 'GET',
              statusText: 'Unauthorized',
            }),
        }}
        mode={mode}
        {...chatWidgetProps}
      />

      <SessionExpiredModal isOpen={isSessionExpired} />
    </>
  );
}

// Example usage:
// <MultiSessionChatWithAuth
//   apiUrl="https://your-api.com"
//   apiKey="your-api-key"
//   mode="light"
//   userName="John Doe"
// />

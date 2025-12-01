import { useState, useCallback, useRef } from 'react';
import { ChatWidget, type ChatWidgetProps, type StorageConfig } from '@microsoft/logicAppsChat';
import { MultiSessionChat } from './MultiSessionChat';
import { LoadingDisplay } from './LoadingDisplay';
import { useFrameBlade } from '../lib/hooks/useFrameBlade';
import { useParentCommunication } from '../lib/hooks/useParentCommunication';
import { createUnauthorizedHandler, getBaseUrl } from '../lib/authHandler';
import type { IframeConfig } from '../lib/utils/config-parser';
import type { ChatHistoryData } from '../lib/types/chat-history';

interface IframeWrapperProps {
  config: IframeConfig;
}

export function IframeWrapper({ config }: IframeWrapperProps) {
  const {
    props,
    multiSession,
    apiKey,
    oboUserToken,
    mode: initialMode = 'light',
    inPortal,
    trustedParentOrigin,
    contextId,
  } = config;

  // State
  const [agentCard, setAgentCard] = useState<any>(null);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(initialMode);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const chatHistoryRef = useRef<ChatHistoryData | null>(null);

  // Check if we should wait for postMessage
  const params = new URLSearchParams(window.location.search);
  const expectPostMessage = params.get('expectPostMessage') === 'true';

  // Handle chat history received from parent blade
  const handleChatHistoryReceived = useCallback((history: ChatHistoryData) => {
    console.log('Chat history received:', history);
    chatHistoryRef.current = history;
    // Note: contextId and messages are now handled through server-side storage
    // The contextId will be passed as initialContextId prop to ChatWidget
  }, []);

  // Frame Blade integration
  const { isReady: isFrameBladeReady } = useFrameBlade({
    enabled: inPortal || false,
    trustedParentOrigin,
    onThemeChange: setCurrentTheme,
    onAuthTokenReceived: setAuthToken,
    onChatHistoryReceived: handleChatHistoryReceived,
  });

  // Parent communication
  const { isWaitingForAgentCard } = useParentCommunication({
    enabled: expectPostMessage,
    onAgentCardReceived: setAgentCard,
  });

  // Show loading states
  if (expectPostMessage && isWaitingForAgentCard) {
    return (
      <LoadingDisplay
        title="Waiting for Configuration"
        message="Waiting for agent card data via postMessage..."
      />
    );
  }

  if (inPortal && !isFrameBladeReady) {
    return (
      <LoadingDisplay title="Initializing Frame Blade..." message="Connecting to Azure Portal..." />
    );
  }

  // Prepare final props
  const finalProps: ChatWidgetProps = agentCard ? { ...props, agentCard } : props;

  // Determine theme mode
  const urlMode = params.get('mode');
  const mode = inPortal ? currentTheme : urlMode === 'dark' ? 'dark' : initialMode;

  // Create unauthorized handler
  const baseUrl = getBaseUrl(
    typeof finalProps.agentCard === 'string' ? finalProps.agentCard : finalProps.agentCard.url
  );
  const onUnauthorized = createUnauthorizedHandler({
    baseUrl,
    onRefreshSuccess: () => console.log('Authentication token refreshed successfully'),
    onRefreshFailed: () => console.log('Authentication token refresh failed, prompting re-login'),
    onLogoutComplete: () => console.log('Logout completed, refreshing page'),
  });

  // Add auth token if available from Frame Blade
  // Also include OBO token if provided via URL or dataset
  const propsWithAuth =
    authToken && inPortal
      ? { ...finalProps, apiKey: authToken, oboUserToken: oboUserToken }
      : { ...finalProps, oboUserToken: oboUserToken };

  // Create storage configuration for server-side chat history
  // Extract base agent URL (remove .well-known/agent-card.json if present)
  const getAgentBaseUrl = (cardUrl: string | undefined): string => {
    if (!cardUrl) return '';
    // Remove .well-known/agent-card.json from the end if it exists
    return cardUrl.replace(/\/\.well-known\/agent-card\.json$/, '');
  };

  const agentBaseUrl =
    typeof propsWithAuth.agentCard === 'string'
      ? getAgentBaseUrl(propsWithAuth.agentCard)
      : propsWithAuth.agentCard
        ? getAgentBaseUrl(propsWithAuth.agentCard.url)
        : '';

  const storageConfig: StorageConfig = {
    type: 'server',
    agentUrl: agentBaseUrl,
    apiKey: apiKey || propsWithAuth.apiKey,
    oboUserToken: oboUserToken || propsWithAuth.oboUserToken,
  };

  console.log('[IframeWrapper] Storage config created:', {
    type: storageConfig.type,
    agentUrl: storageConfig.agentUrl,
    hasApiKey: !!storageConfig.apiKey,
    hasOboUserToken: !!storageConfig.oboUserToken,
  });

  // Render appropriate chat component
  if (multiSession) {
    return (
      <MultiSessionChat
        config={{
          apiUrl:
            typeof propsWithAuth.agentCard === 'string'
              ? propsWithAuth.agentCard
              : propsWithAuth.agentCard.url,
          apiKey: apiKey || propsWithAuth.apiKey || '',
          oboUserToken: oboUserToken || propsWithAuth.oboUserToken || '',
          onUnauthorized,
          storageConfig,
        }}
        {...propsWithAuth}
        mode={mode}
      />
    );
  }

  // For single-session mode, determine the initial context ID
  const sessionKey = propsWithAuth.sessionKey || 'default';

  // Use contextId from URL config, or from chat history received via postMessage
  const initialContextId = contextId || chatHistoryRef.current?.contextId;

  return (
    <ChatWidget
      {...propsWithAuth}
      mode={mode}
      fluentTheme={mode}
      onUnauthorized={onUnauthorized}
      sessionKey={sessionKey}
      storageConfig={storageConfig}
      initialContextId={initialContextId}
    />
  );
}

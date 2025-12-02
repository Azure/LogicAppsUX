import { useState, useCallback, useRef, useMemo } from 'react';
import { ChatWidget, type ChatWidgetProps, type StorageConfig } from '@microsoft/logicAppsChat';
import { MultiSessionChat } from './MultiSessionChat/MultiSessionChat';
import { LoadingDisplay } from './LoadingDisplay';
import { LoginPrompt } from './LoginPrompt';
import { useFrameBlade } from '../lib/hooks/useFrameBlade';
import { useParentCommunication } from '../lib/hooks/useParentCommunication';
import { getBaseUrl, openLoginPopup, createUnauthorizedHandler } from '../lib/authHandler';
import { getAgentBaseUrl, type IframeConfig } from '../lib/utils/config-parser';
import type { ChatHistoryData } from '../lib/types/chat-history';
import { FluentProvider, webDarkTheme, webLightTheme } from '@fluentui/react-components';

interface IframeWrapperProps {
  config: IframeConfig;
}

export function IframeWrapper({ config }: IframeWrapperProps) {
  const { props, multiSession, apiKey, oboUserToken, mode: initialMode = 'light', inPortal, trustedParentOrigin, contextId } = config;

  // State
  const [agentCard, setAgentCard] = useState<any>(null);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(initialMode);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const chatHistoryRef = useRef<ChatHistoryData | null>(null);

  // Check if we should wait for postMessage
  const params = new URLSearchParams(window.location.search);
  const expectPostMessage = params.get('expectPostMessage') === 'true';

  // Compute base URL for auth
  const agentCardUrl = props.agentCard;
  const baseUrl = getBaseUrl(typeof agentCardUrl === 'string' ? agentCardUrl : agentCardUrl?.url);

  // Determine theme mode
  const urlMode = params.get('mode');
  const mode = inPortal ? currentTheme : urlMode === 'dark' ? 'dark' : initialMode;
  const theme = useMemo(() => (mode === 'dark' ? webDarkTheme : webLightTheme), [mode]);

  // Handle login button click
  const handleLogin = useCallback(() => {
    setIsLoggingIn(true);
    openLoginPopup({
      baseUrl,
      onSuccess: () => {
        setNeedsLogin(false);
        setIsLoggingIn(false);
        // Reload the page to retry fetching with new auth cookies
        window.location.reload();
      },
      onFailed: () => {
        setIsLoggingIn(false);
      },
    });
  }, [baseUrl]);

  // Create unauthorized handler - tries refresh first, then shows login UI
  const handleUnauthorized = useMemo(
    () =>
      createUnauthorizedHandler({
        baseUrl,
        onLoginRequired: () => {
          setNeedsLogin(true);
        },
      }),
    [baseUrl]
  );

  // Handle chat history received from parent blade
  const handleChatHistoryReceived = useCallback((history: ChatHistoryData) => {
    chatHistoryRef.current = history;
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
    return <LoadingDisplay title="Waiting for Configuration" message="Waiting for agent card data via postMessage..." />;
  }

  if (inPortal && !isFrameBladeReady) {
    return <LoadingDisplay title="Initializing Frame Blade..." message="Connecting to Azure Portal..." />;
  }

  if (needsLogin) {
    return (
      <FluentProvider theme={theme}>
        <LoginPrompt onLogin={handleLogin} isLoading={isLoggingIn} />
      </FluentProvider>
    );
  }

  // Prepare final props
  const finalProps: ChatWidgetProps = agentCard ? { ...props, agentCard } : props;

  // Add auth token if available from Frame Blade
  // Also include OBO token if provided via URL or dataset
  const propsWithAuth =
    authToken && inPortal
      ? { ...finalProps, apiKey: authToken, oboUserToken: oboUserToken }
      : { ...finalProps, oboUserToken: oboUserToken };

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

  // Render appropriate chat component
  if (multiSession) {
    return (
      <FluentProvider theme={theme}>
        <MultiSessionChat
          config={{
            apiUrl: typeof propsWithAuth.agentCard === 'string' ? propsWithAuth.agentCard : propsWithAuth.agentCard.url,
            apiKey: apiKey || propsWithAuth.apiKey || '',
            oboUserToken: oboUserToken || propsWithAuth.oboUserToken || '',
            onUnauthorized: handleUnauthorized,
            storageConfig,
          }}
          {...propsWithAuth}
          mode={mode}
        />
      </FluentProvider>
    );
  }

  // For single-session mode, determine the initial context ID
  const sessionKey = propsWithAuth.sessionKey || 'default';

  // Use contextId from URL config, or from chat history received via postMessage
  const initialContextId = contextId || chatHistoryRef.current?.contextId;

  return (
    <FluentProvider theme={theme}>
      <ChatWidget
        {...propsWithAuth}
        mode={mode}
        fluentTheme={mode}
        onUnauthorized={handleUnauthorized}
        sessionKey={sessionKey}
        storageConfig={storageConfig}
        initialContextId={initialContextId}
      />
    </FluentProvider>
  );
}

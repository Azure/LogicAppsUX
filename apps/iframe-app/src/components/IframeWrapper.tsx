import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { ChatWidget, type IdentityProvider, type ChatWidgetProps, type StorageConfig } from '@microsoft/logic-apps-chat';
import { MultiSessionChat } from './MultiSessionChat/MultiSessionChat';
import { LoadingDisplay } from './LoadingDisplay';
import { LoginPrompt } from './LoginPrompt';
import { useFrameBlade } from '../lib/hooks/useFrameBlade';
import { useParentCommunication } from '../lib/hooks/useParentCommunication';
import { getBaseUrl, openLoginPopup, createUnauthorizedHandler, checkAuthStatus } from '../lib/authHandler';
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
  const [needsLogin, setNeedsLogin] = useState(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | undefined>(props.userName);
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
  const handleLogin = useCallback(
    (provider: IdentityProvider) => {
      setIsLoggingIn(true);
      setLoginError(null);
      openLoginPopup({
        baseUrl,
        signInEndpoint: provider.signInEndpoint,
        onSuccess: () => {
          setNeedsLogin(false);
          setIsLoggingIn(false);
          setLoginError(null);
        },
        onFailed: (error: Error) => {
          setIsLoggingIn(false);
          setLoginError(error.message);
        },
      });
    },
    [baseUrl]
  );

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

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      // Skip auth check if in portal mode or if we have an API key
      if (inPortal || apiKey) {
        setIsCheckingAuth(false);
        setNeedsLogin(false);
        return;
      }

      try {
        const { isAuthenticated, username } = await checkAuthStatus(baseUrl);
        setNeedsLogin(!isAuthenticated);
        if (isAuthenticated && username) {
          setUserName(username);
        }
      } catch (error) {
        console.error('[Auth] Failed to check authentication status:', error);
        setNeedsLogin(true);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, [baseUrl, inPortal, apiKey]);

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

  if (isCheckingAuth) {
    return <LoadingDisplay title="Checking Authentication" message="Verifying authentication status..." />;
  }

  if (needsLogin) {
    return (
      <FluentProvider theme={theme}>
        <LoginPrompt
          onLogin={handleLogin}
          isLoading={isLoggingIn}
          error={loginError ?? undefined}
          identityProviders={props.identityProviders}
        />
      </FluentProvider>
    );
  }

  // Prepare final props
  const finalProps: ChatWidgetProps = agentCard ? { ...props, agentCard, userName: userName } : { ...props, userName: userName };

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

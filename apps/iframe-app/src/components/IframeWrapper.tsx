import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { ChatWidget, type IdentityProvider, type ChatWidgetProps, type StorageConfig } from '@microsoft/logic-apps-chat';
import { MultiSessionChat } from './MultiSessionChat/MultiSessionChat';
import { LoadingDisplay } from './LoadingDisplay';
import { LoginPrompt } from './LoginPrompt';
import { useFrameBlade } from '../lib/hooks/useFrameBlade';
import { useParentCommunication } from '../lib/hooks/useParentCommunication';
import { getBaseUrl, openLoginPopup, createUnauthorizedHandler, checkAuthStatus } from '../lib/authHandler';
import type { IframeConfig } from '../lib/utils/config-parser';
import type { ChatHistoryData } from '../lib/types/chat-history';
import { FluentProvider, webDarkTheme, webLightTheme } from '@fluentui/react-components';
import { useAgentCard } from '../hooks/useAgentCard';

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
        onSuccess: (authInfo) => {
          if (authInfo.username) {
            setUserName(authInfo.username);
          }
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
        const { isAuthenticated, isEasyAuthConfigured, username } = await checkAuthStatus(baseUrl);

        // Easy Auth is NOT configured (404 from /.auth/me)
        // Let it fail naturally - the API calls will fail without apiKey
        if (!isEasyAuthConfigured) {
          setNeedsLogin(false);
          return;
        }

        // Easy Auth IS configured
        // Check if identity providers are configured
        const hasIdentityProviders = props.identityProviders && Object.keys(props.identityProviders).length > 0;

        if (!hasIdentityProviders) {
          // No identity providers configured - skip login, show chat directly
          setNeedsLogin(false);
        } else if (isAuthenticated) {
          // User is already authenticated
          setNeedsLogin(false);
          if (username) {
            setUserName(username);
          }
        } else {
          // Identity providers configured but user not authenticated - show login
          setNeedsLogin(true);
        }
      } catch (error) {
        console.error('[Auth] Failed to check authentication status:', error);
        setNeedsLogin(true);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, [baseUrl, inPortal, apiKey, props.identityProviders]);

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

  // Prepare final props
  const finalProps: ChatWidgetProps = { ...props, ...(agentCard && { agentCard }), userName };

  // Add auth token if available from Frame Blade
  // Also include OBO token if provided via URL or dataset
  const propsWithAuth =
    authToken && inPortal
      ? { ...finalProps, apiKey: authToken, oboUserToken: oboUserToken }
      : { ...finalProps, oboUserToken: oboUserToken };

  const agentCardConfig = useMemo(
    () => ({
      apiUrl: typeof propsWithAuth.agentCard === 'string' ? propsWithAuth.agentCard : propsWithAuth.agentCard.url,
      apiKey: apiKey || propsWithAuth.apiKey || '',
      oboUserToken: oboUserToken || propsWithAuth.oboUserToken || '',
      onUnauthorized: handleUnauthorized,
    }),
    [propsWithAuth.agentCard, propsWithAuth.apiKey, propsWithAuth.oboUserToken, apiKey, oboUserToken, handleUnauthorized]
  );

  const { data: agentCardData } = useAgentCard(agentCardConfig);

  const storageConfig: StorageConfig | undefined = useMemo(() => {
    if (!agentCardData?.url) {
      return undefined;
    }
    return {
      type: 'server',
      agentUrl: agentCardData?.url,
      apiKey: apiKey || propsWithAuth.apiKey,
      oboUserToken: oboUserToken || propsWithAuth.oboUserToken,
    };
  }, [agentCardData, apiKey, propsWithAuth.apiKey, oboUserToken, propsWithAuth.oboUserToken]);

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

  // Render appropriate chat component
  if (multiSession) {
    return (
      <FluentProvider theme={theme}>
        <MultiSessionChat
          config={{
            ...agentCardConfig,
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

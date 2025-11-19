import { useCallback, useEffect, useState, useRef } from 'react';
import {
  ChatWidget,
  ChatWidgetProps,
  ChatThemeProvider,
  StorageConfig,
  useChatStore,
  ServerHistoryStorage,
} from '@microsoft/logicAppsChat';
import { AgentCard, isDirectAgentCardUrl } from '@microsoft/logicAppsChat';
import {
  FluentProvider,
  makeStyles,
  tokens,
  shorthands,
  Spinner,
  mergeClasses,
} from '@fluentui/react-components';
import { webLightTheme, webDarkTheme } from '@fluentui/react-components';
import { useChatSessions } from '../hooks/useChatSessions';
import { SessionList } from './SessionList';

const useStyles = makeStyles({
  multiSessionContainer: {
    display: 'flex',
    height: '100vh',
    width: '100%',
    overflow: 'hidden',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  sidebar: {
    height: '100vh',
    flexShrink: 0,
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke1),
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  },
  sidebarTransition: {
    transition: 'width 0.3s ease',
  },
  sidebarCollapsed: {
    width: '0px !important',
    ...shorthands.borderRight('none'),
    overflow: 'hidden',
  },
  resizeHandle: {
    position: 'absolute',
    right: '-3px',
    top: 0,
    bottom: 0,
    width: '6px',
    cursor: 'col-resize',
    backgroundColor: 'transparent',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: tokens.colorBrandBackground,
    },
  },
  resizing: {
    userSelect: 'none',
    cursor: 'col-resize',
  },
  chatArea: {
    flex: 1,
    height: '100vh',
    minWidth: 0,
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  sessionChat: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  sessionChatHidden: {
    visibility: 'hidden',
    pointerEvents: 'none',
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalM),
  },
  errorContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    color: tokens.colorPaletteRedForeground1,
  },
});

interface MultiSessionChatProps extends Omit<ChatWidgetProps, 'agentCard'> {
  config: {
    apiUrl: string;
    apiKey?: string;
    oboUserToken?: string;
    onUnauthorized?: () => void | Promise<void>;
    storageConfig?: StorageConfig;
  };
  mode?: 'light' | 'dark';
}

export function MultiSessionChat({
  config,
  mode = 'light',
  ...chatWidgetProps
}: MultiSessionChatProps) {
  const styles = useStyles();
  const [agentCard, setAgentCard] = useState<AgentCard | undefined>();
  const [isLoadingAgent, setIsLoadingAgent] = useState(true);
  const [agentError, setAgentError] = useState<Error | undefined>();
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Initialize storage on mount
  useEffect(() => {
    async function initializeStorage() {
      try {
        console.log('[MultiSessionChat] Initializing storage...');
        const { initializeStorage, loadSessions } = useChatStore.getState();

        if (config.storageConfig && config.storageConfig.type === 'server') {
          // Create ServerHistoryStorage instance from config
          const storage = new ServerHistoryStorage({
            agentUrl: config.storageConfig.agentUrl || config.apiUrl,
            apiKey: config.storageConfig.apiKey || config.apiKey,
            oboUserToken: config.storageConfig.oboUserToken || config.oboUserToken,
          });

          initializeStorage(storage);
          console.log('[MultiSessionChat] Storage initialized, loading sessions...');
          await loadSessions();
          console.log('[MultiSessionChat] Sessions loaded from server');
        }
      } catch (error) {
        console.error('[MultiSessionChat] Error initializing storage:', error);
      }
    }

    initializeStorage();
  }, [config.storageConfig, config.apiUrl]);

  const {
    sessions,
    activeSessionId,
    createNewSession,
    switchSession,
    renameSession,
    deleteSession,
  } = useChatSessions();

  // Check screen size and auto-collapse on small screens
  useEffect(() => {
    const checkScreenSize = () => {
      if (window.innerWidth < 720) {
        setIsCollapsed(true);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  // Handle sidebar resizing
  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  useEffect(() => {
    let animationFrameId: number;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      // Cancel any pending animation frame
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      // Use requestAnimationFrame for smooth updates
      animationFrameId = requestAnimationFrame(() => {
        const newWidth = e.clientX;
        if (newWidth >= 200 && newWidth <= 400) {
          setSidebarWidth(newWidth);
        }
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
    } else {
      document.body.style.cursor = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isResizing]);

  const toggleSidebar = useCallback(() => {
    setIsCollapsed(!isCollapsed);
  }, [isCollapsed]);

  // Fetch agent card once on mount
  useEffect(() => {
    let cancelled = false;

    async function fetchAgentCard() {
      try {
        setIsLoadingAgent(true);
        setAgentError(undefined);

        const url = isDirectAgentCardUrl(config.apiUrl)
          ? config.apiUrl
          : `${config.apiUrl}/.well-known/agent-card.json`;

        const requestInit: RequestInit = {};
        const headers: HeadersInit = {};
        if (config.apiKey) {
          headers['X-API-Key'] = config.apiKey;
        }
        if (config.oboUserToken) {
          headers['x-ms-obo-userToken'] = `Key ${config.oboUserToken}`;
        }

        if (headers['X-API-Key'] || headers['x-ms-obo-userToken']) {
          requestInit.headers = headers;
        } else {
          requestInit.credentials = 'include';
        }

        const response = await fetch(url, requestInit);
        if (!response.ok) {
          throw new Error(`Failed to fetch agent card: ${response.statusText}`);
        }

        const card = (await response.json()) as AgentCard;

        if (!cancelled) {
          setAgentCard(card);
        }
      } catch (err) {
        if (!cancelled) {
          setAgentError(err as Error);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingAgent(false);
        }
      }
    }

    fetchAgentCard();

    return () => {
      cancelled = true;
    };
  }, [config.apiUrl]);

  const handleNewSession = useCallback(async () => {
    try {
      await createNewSession();
    } catch (error) {
      console.error('Error creating new session:', error);
    }
  }, [createNewSession]);

  const handleSessionClick = useCallback(
    async (sessionId: string) => {
      try {
        await switchSession(sessionId);
      } catch (error) {
        console.error('Error switching session:', error);
      }
    },
    [switchSession]
  );

  // Context ID is now managed server-side only
  const handleContextIdChange = useCallback(async (contextId: string) => {
    // Server manages context IDs, no local storage needed
    console.log('[MultiSessionChat] Context ID changed:', contextId);
  }, []);

  // Update viewed session when activeSessionId changes
  useEffect(() => {
    if (activeSessionId) {
      useChatStore.getState().setViewedSession(activeSessionId);
    }
  }, [activeSessionId]);

  // Show loading state while fetching agent card
  if (isLoadingAgent) {
    return (
      <FluentProvider theme={mode === 'dark' ? webDarkTheme : webLightTheme}>
        <div className={styles.loadingContainer}>
          <Spinner size="medium" />
          <div>Loading agent...</div>
        </div>
      </FluentProvider>
    );
  }

  // Show error if agent card failed to load
  if (agentError || !agentCard) {
    return (
      <FluentProvider theme={mode === 'dark' ? webDarkTheme : webLightTheme}>
        <div className={styles.errorContainer}>
          <div>Error: {agentError?.message || 'Failed to load agent'}</div>
        </div>
      </FluentProvider>
    );
  }

  // Don't block rendering if no active session - let SessionList handle creating first session

  return (
    <FluentProvider theme={mode === 'dark' ? webDarkTheme : webLightTheme}>
      <div className={mergeClasses(styles.multiSessionContainer, isResizing && styles.resizing)}>
        <div
          ref={sidebarRef}
          className={mergeClasses(
            styles.sidebar,
            !isResizing && styles.sidebarTransition,
            isCollapsed && styles.sidebarCollapsed
          )}
          style={{ width: isCollapsed ? 0 : sidebarWidth }}
        >
          <SessionList
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSessionClick={handleSessionClick}
            onNewSession={handleNewSession}
            onRenameSession={async (id, name) => {
              try {
                await renameSession(id, name);
              } catch (error) {
                console.error('Error renaming session:', error);
              }
            }}
            onDeleteSession={async (id) => {
              try {
                await deleteSession(id);
              } catch (error) {
                console.error('Error deleting session:', error);
              }
            }}
            logoUrl={chatWidgetProps.theme?.branding?.logoUrl}
            logoSize={chatWidgetProps.theme?.branding?.logoSize}
            themeColors={chatWidgetProps.theme?.colors}
          />
          {!isCollapsed && (
            <div
              className={styles.resizeHandle}
              onMouseDown={startResizing}
              onMouseEnter={(e) => {
                if (chatWidgetProps.theme?.colors?.primary) {
                  e.currentTarget.style.backgroundColor = chatWidgetProps.theme.colors.primary;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            />
          )}
        </div>
        <div className={styles.chatArea}>
          <ChatThemeProvider theme={mode}>
            {sessions.map((session) => (
              <div
                key={session.id}
                className={mergeClasses(
                  styles.sessionChat,
                  session.id !== activeSessionId && styles.sessionChatHidden
                )}
              >
                <ChatWidget
                  agentCard={agentCard}
                  apiKey={config.apiKey}
                  oboUserToken={config.oboUserToken}
                  sessionKey={`a2a-chat-session-${session.id}`}
                  sessionId={session.id}
                  agentUrl={config.apiUrl}
                  metadata={{
                    ...chatWidgetProps.metadata,
                    sessionId: session.id,
                  }}
                  theme={chatWidgetProps.theme}
                  userName={chatWidgetProps.userName}
                  placeholder={chatWidgetProps.placeholder}
                  welcomeMessage={chatWidgetProps.welcomeMessage}
                  allowFileUpload={false}
                  onToggleSidebar={toggleSidebar}
                  isSidebarCollapsed={isCollapsed}
                  mode={mode}
                  fluentTheme={mode}
                  onUnauthorized={config.onUnauthorized}
                  onContextIdChange={handleContextIdChange}
                  sessionName={session.name}
                  onRenameSession={async (newName: string) => {
                    await renameSession(session.id, newName);
                  }}
                  storageConfig={config.storageConfig}
                  initialContextId={session.id || undefined}
                />
              </div>
            ))}
          </ChatThemeProvider>
        </div>
      </div>
    </FluentProvider>
  );
}

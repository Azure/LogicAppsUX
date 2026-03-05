import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MultiSessionChat } from '../MultiSessionChat';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// Mock the hooks and dependencies
vi.mock('../../../hooks/useAgentCard', () => ({ useAgentCard: vi.fn() }));
vi.mock('../../../hooks/useChatSessions', () => ({ useChatSessions: vi.fn() }));

vi.mock('@microsoft/logic-apps-chat', () => ({
  ChatWidget: vi.fn(({ sessionId, onToggleSidebar }) => (
    <div data-testid={`chat-widget-${sessionId}`}>
      <button data-testid="toggle-sidebar" onClick={onToggleSidebar}>
        Toggle
      </button>
    </div>
  )),
  ChatThemeProvider: vi.fn(({ children }) => <div data-testid="chat-theme-provider">{children}</div>),
  useChatStore: { getState: vi.fn(() => ({ initializeStorage: vi.fn(), loadSessions: vi.fn(), setViewedSession: vi.fn() })) },
  ServerHistoryStorage: vi.fn(),
}));

vi.mock('../../SessionList/SessionList', () => ({
  SessionList: vi.fn(({ sessions, onSessionClick, onNewSession, onRenameSession, onDeleteSession }) => (
    <div data-testid="session-list">
      <button data-testid="new-session-btn" onClick={onNewSession}>
        New
      </button>
      {sessions.map((s: any) => (
        <div key={s.id} data-testid={`session-${s.id}`}>
          <button data-testid={`session-click-${s.id}`} onClick={() => onSessionClick(s.id)}>
            {s.name}
          </button>
          <button data-testid={`session-rename-${s.id}`} onClick={() => onRenameSession(s.id, 'New Name')}>
            Rename
          </button>
          <button data-testid={`session-delete-${s.id}`} onClick={() => onDeleteSession(s.id)}>
            Delete
          </button>
        </div>
      ))}
    </div>
  )),
}));

vi.mock('../MultiSessionChatStyles', () => ({
  useMultiSessionChatStyles: vi.fn(() => ({
    multiSessionContainer: 'multi-session-container',
    sidebar: 'sidebar',
    sidebarTransition: 'sidebar-transition',
    sidebarCollapsed: 'sidebar-collapsed',
    chatArea: 'chat-area',
    sessionChat: 'session-chat',
    sessionChatHidden: 'session-chat-hidden',
    loadingContainer: 'loading-container',
    errorContainer: 'error-container',
  })),
}));

describe('MultiSessionChat', () => {
  let queryClient: QueryClient;
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

  const defaultConfig = { apiUrl: 'https://api.example.com', apiKey: 'test-api-key' };
  const mockAgentCard = { name: 'Test Agent', url: 'https://agent.example.com/api', description: 'A test agent' };
  const mockSessions = [
    { id: 'session-1', name: 'Session 1', createdAt: Date.now(), updatedAt: Date.now() },
    { id: 'session-2', name: 'Session 2', createdAt: Date.now(), updatedAt: Date.now() },
  ];

  const createMockSessionHooks = (overrides = {}) => ({
    sessions: mockSessions,
    activeSessionId: 'session-1',
    createNewSession: vi.fn(),
    switchSession: vi.fn(),
    renameSession: vi.fn(),
    deleteSession: vi.fn(),
    ...overrides,
  });

  const setupMocks = async (agentState: { data?: any; isLoading?: boolean; error?: Error | null }, sessionOverrides = {}) => {
    const { useAgentCard } = await import('../../../hooks/useAgentCard');
    const { useChatSessions } = await import('../../../hooks/useChatSessions');
    vi.mocked(useAgentCard).mockReturnValue({ data: undefined, isLoading: false, error: null, ...agentState } as any);
    vi.mocked(useChatSessions).mockReturnValue(createMockSessionHooks(sessionOverrides));
    return { useAgentCard, useChatSessions };
  };

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.clearAllMocks();
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
  });

  afterEach(() => queryClient.clear());

  describe('Loading and Error States', () => {
    it('should show loading state while fetching agent card', async () => {
      await setupMocks({ isLoading: true }, { sessions: [], activeSessionId: null });
      render(<MultiSessionChat config={defaultConfig} />, { wrapper });
      expect(screen.getByText('Loading agent...')).toBeInTheDocument();
    });

    it('should show error state when agent card fails to load', async () => {
      await setupMocks({ error: new Error('Failed to fetch') }, { sessions: [], activeSessionId: null });
      render(<MultiSessionChat config={defaultConfig} />, { wrapper });
      expect(screen.getByText('Error: Failed to fetch')).toBeInTheDocument();
    });

    it('should show error state when agent card is null', async () => {
      await setupMocks({ data: null }, { sessions: [], activeSessionId: null });
      render(<MultiSessionChat config={defaultConfig} />, { wrapper });
      expect(screen.getByText('Error: Failed to load agent')).toBeInTheDocument();
    });
  });

  describe('Successful Rendering', () => {
    it('should render session list and chat widgets when loaded', async () => {
      await setupMocks({ data: mockAgentCard });
      render(<MultiSessionChat config={defaultConfig} />, { wrapper });
      expect(screen.getByTestId('session-list')).toBeInTheDocument();
      expect(screen.getByTestId('chat-widget-session-1')).toBeInTheDocument();
      expect(screen.getByTestId('chat-widget-session-2')).toBeInTheDocument();
    });

    it('should render with empty sessions array', async () => {
      await setupMocks({ data: mockAgentCard }, { sessions: [], activeSessionId: null });
      render(<MultiSessionChat config={defaultConfig} />, { wrapper });
      expect(screen.getByTestId('session-list')).toBeInTheDocument();
      expect(screen.getByTestId('chat-theme-provider')).toBeInTheDocument();
    });
  });

  describe('Session Operations', () => {
    it.each([
      ['create', 'new-session-btn', 'createNewSession', undefined],
      ['switch', 'session-click-session-2', 'switchSession', 'session-2'],
      ['rename', 'session-rename-session-1', 'renameSession', ['session-1', 'New Name']],
      ['delete', 'session-delete-session-1', 'deleteSession', 'session-1'],
    ])('should %s session when triggered', async (_, testId, fnName, expectedArg) => {
      const mockFn = vi.fn();
      await setupMocks({ data: mockAgentCard }, { [fnName]: mockFn });
      render(<MultiSessionChat config={defaultConfig} />, { wrapper });
      fireEvent.click(screen.getByTestId(testId));
      await waitFor(() => {
        expectedArg === undefined
          ? expect(mockFn).toHaveBeenCalled()
          : Array.isArray(expectedArg)
            ? expect(mockFn).toHaveBeenCalledWith(...expectedArg)
            : expect(mockFn).toHaveBeenCalledWith(expectedArg);
      });
    });

    it.each([
      ['creating', 'new-session-btn', 'createNewSession', 'Error creating new session:'],
      ['switching', 'session-click-session-2', 'switchSession', 'Error switching session:'],
    ])('should handle errors when %s session fails', async (_, testId, fnName, errorMsg) => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await setupMocks({ data: mockAgentCard }, { [fnName]: vi.fn().mockRejectedValue(new Error('Failed')) });
      render(<MultiSessionChat config={defaultConfig} />, { wrapper });
      fireEvent.click(screen.getByTestId(testId));
      await waitFor(() => expect(consoleSpy).toHaveBeenCalledWith(errorMsg, expect.any(Error)));
      consoleSpy.mockRestore();
    });
  });

  describe('Sidebar Behavior', () => {
    it('should toggle sidebar when toggle button is clicked', async () => {
      await setupMocks({ data: mockAgentCard });
      render(<MultiSessionChat config={defaultConfig} />, { wrapper });
      const sidebar = document.querySelector('.sidebar');
      expect(sidebar).toHaveStyle({ width: '260px' });
      fireEvent.click(screen.getAllByTestId('toggle-sidebar')[0]);
      await waitFor(() => expect(sidebar).toHaveStyle({ width: '0px' }));
    });

    it('should auto-collapse sidebar on small screens', async () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 600 });
      await setupMocks({ data: mockAgentCard });
      render(<MultiSessionChat config={defaultConfig} />, { wrapper });
      expect(document.querySelector('.sidebar')).toHaveStyle({ width: '0px' });
    });
  });

  describe('ChatWidget Props', () => {
    it('should pass correct props to ChatWidget', async () => {
      await setupMocks({ data: mockAgentCard }, { sessions: [mockSessions[0]] });
      const { ChatWidget } = await import('@microsoft/logic-apps-chat');
      const storageConfig = { type: 'server' as const, agentUrl: 'https://agent.example.com/api', apiKey: 'test-key' };
      render(<MultiSessionChat config={{ ...defaultConfig, storageConfig }} mode="dark" userName="Test User" />, { wrapper });
      expect(ChatWidget).toHaveBeenCalledWith(
        expect.objectContaining({
          agentCard: mockAgentCard,
          sessionId: 'session-1',
          mode: 'dark',
          fluentTheme: 'dark',
          userName: 'Test User',
          storageConfig,
        }),
        {}
      );
    });

    it('should use light mode by default', async () => {
      await setupMocks({ data: mockAgentCard }, { sessions: [mockSessions[0]] });
      const { ChatWidget } = await import('@microsoft/logic-apps-chat');
      render(<MultiSessionChat config={defaultConfig} />, { wrapper });
      expect(ChatWidget).toHaveBeenCalledWith(expect.objectContaining({ mode: 'light', fluentTheme: 'light' }), {});
    });
  });

  describe('Storage Initialization', () => {
    it('should initialize storage when storageConfig is provided', async () => {
      const { useChatStore, ServerHistoryStorage } = await import('@microsoft/logic-apps-chat');
      const mockInitializeStorage = vi.fn();
      const mockLoadSessions = vi.fn();
      vi.mocked(useChatStore.getState).mockReturnValue({
        initializeStorage: mockInitializeStorage,
        loadSessions: mockLoadSessions,
        setViewedSession: vi.fn(),
      } as any);
      await setupMocks({ data: mockAgentCard });
      const storageConfig = { type: 'server' as const, agentUrl: 'https://storage.example.com', apiKey: 'storage-key' };
      render(<MultiSessionChat config={{ ...defaultConfig, storageConfig }} />, { wrapper });
      await waitFor(() => {
        expect(ServerHistoryStorage).toHaveBeenCalledWith({
          agentUrl: 'https://storage.example.com',
          apiKey: 'storage-key',
          oboUserToken: undefined,
        });
        expect(mockInitializeStorage).toHaveBeenCalled();
        expect(mockLoadSessions).toHaveBeenCalled();
      });
    });
  });
});

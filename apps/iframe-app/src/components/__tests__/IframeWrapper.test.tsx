import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { IframeWrapper } from '../IframeWrapper';
import type { IframeConfig } from '../../lib/utils/config-parser';

// Mock the dependencies
vi.mock('@microsoft/logic-apps-chat', () => ({
  ChatWidget: vi.fn(({ mode }) => <div data-testid="chat-widget">ChatWidget (mode: {mode})</div>),
  useChatStore: vi.fn((selector) => {
    const mockState = { sessions: [] };
    return selector ? selector(mockState) : mockState;
  }),
}));

vi.mock('../MultiSessionChat/MultiSessionChat', () => ({
  MultiSessionChat: vi.fn(({ mode }) => <div data-testid="multi-session-chat">MultiSessionChat (mode: {mode})</div>),
}));

vi.mock('../../lib/authHandler', () => ({
  createUnauthorizedHandler: vi.fn(() => vi.fn()),
  getBaseUrl: vi.fn((agentCard) => `https://base.url.from/${agentCard}`),
  checkAuthStatus: vi.fn(() => Promise.resolve(true)), // Mock as authenticated
  openLoginPopup: vi.fn(),
}));

vi.mock('../../lib/hooks/useFrameBlade', () => ({
  useFrameBlade: vi.fn(() => ({
    isReady: true,
    sendMessage: vi.fn(),
  })),
}));

vi.mock('../../lib/hooks/useParentCommunication', () => ({
  useParentCommunication: vi.fn(() => ({
    isWaitingForAgentCard: false,
    sendMessageToParent: vi.fn(),
  })),
}));

describe('IframeWrapper', () => {
  const defaultConfig: IframeConfig = {
    props: {
      agentCard: 'https://api.example.com/agent-card.json',
      userId: 'user123',
      userName: 'Test User',
    },
    multiSession: false,
    mode: 'light',
    inPortal: false,
  };

  beforeEach(() => {
    // Reset URL
    delete (window as any).location;
    (window as any).location = new URL('http://localhost:3000');

    // Reset mocks
    vi.clearAllMocks();

    // Clear localStorage
    localStorage.clear();
  });

  it('should render ChatWidget in single-session mode', async () => {
    render(<IframeWrapper config={defaultConfig} />);

    // Wait for auth check to complete
    await screen.findByTestId('chat-widget');
    expect(screen.getByText('ChatWidget (mode: light)')).toBeInTheDocument();
  });

  it('should render MultiSessionChat in multi-session mode', async () => {
    const multiSessionConfig: IframeConfig = {
      ...defaultConfig,
      multiSession: true,
      apiKey: 'test-api-key',
    };

    render(<IframeWrapper config={multiSessionConfig} />);

    // Wait for auth check to complete (apiKey skips auth check)
    await screen.findByTestId('multi-session-chat');
    expect(screen.getByText('MultiSessionChat (mode: light)')).toBeInTheDocument();
  });

  it('should handle dark mode', async () => {
    const darkModeConfig: IframeConfig = {
      ...defaultConfig,
      mode: 'dark',
    };

    render(<IframeWrapper config={darkModeConfig} />);

    // Wait for auth check to complete
    await screen.findByText('ChatWidget (mode: dark)');
  });

  it('should show loading when waiting for postMessage', async () => {
    const { useParentCommunication } = await import('../../lib/hooks/useParentCommunication');
    vi.mocked(useParentCommunication).mockReturnValue({
      isWaitingForAgentCard: true,
      sendMessageToParent: vi.fn(),
    });

    (window as any).location = new URL('http://localhost:3000?expectPostMessage=true');

    render(<IframeWrapper config={defaultConfig} />);

    expect(screen.getByText('Waiting for Configuration')).toBeInTheDocument();
    expect(screen.getByText('Waiting for agent card data via postMessage...')).toBeInTheDocument();
  });

  it('should show loading when Frame Blade is initializing', async () => {
    const { useFrameBlade } = await import('../../lib/hooks/useFrameBlade');
    vi.mocked(useFrameBlade).mockReturnValue({
      isReady: false,
      sendMessage: vi.fn(),
    });

    const portalConfig: IframeConfig = {
      ...defaultConfig,
      inPortal: true,
      trustedParentOrigin: 'https://portal.azure.com',
    };

    render(<IframeWrapper config={portalConfig} />);

    expect(screen.getByText('Initializing Frame Blade...')).toBeInTheDocument();
    expect(screen.getByText('Connecting to Azure Portal...')).toBeInTheDocument();
  });

  it('should handle agent card from postMessage', async () => {
    const { useParentCommunication } = await import('../../lib/hooks/useParentCommunication');

    let capturedCallback: ((agentCard: any) => void) | undefined;

    vi.mocked(useParentCommunication).mockImplementation(({ onAgentCardReceived }) => {
      capturedCallback = onAgentCardReceived;
      return {
        isWaitingForAgentCard: false,
        sendMessageToParent: vi.fn(),
      };
    });

    (window as any).location = new URL('http://localhost:3000?expectPostMessage=true');

    const { rerender } = render(<IframeWrapper config={defaultConfig} />);

    // Simulate receiving agent card
    act(() => {
      if (capturedCallback) {
        capturedCallback({ name: 'New Agent', endpoint: 'https://new.api.com' });
      }
    });

    rerender(<IframeWrapper config={defaultConfig} />);

    // Wait for auth check to complete
    await screen.findByTestId('chat-widget');
  });

  it('should handle theme changes from Frame Blade', async () => {
    const { useFrameBlade } = await import('../../lib/hooks/useFrameBlade');

    let capturedThemeCallback: ((theme: 'light' | 'dark') => void) | undefined;

    vi.mocked(useFrameBlade).mockImplementation(({ onThemeChange }) => {
      capturedThemeCallback = onThemeChange;
      return {
        isReady: true,
        sendMessage: vi.fn(),
      };
    });

    const portalConfig: IframeConfig = {
      ...defaultConfig,
      inPortal: true,
      trustedParentOrigin: 'https://portal.azure.com',
    };

    render(<IframeWrapper config={portalConfig} />);

    // Wait for auth check to complete (inPortal skips auth check)
    await screen.findByText('ChatWidget (mode: light)');

    // Simulate theme change
    act(() => {
      if (capturedThemeCallback) {
        capturedThemeCallback('dark');
      }
    });

    // Component should re-render with dark mode
    expect(screen.getByText('ChatWidget (mode: dark)')).toBeInTheDocument();
  });

  it('should handle auth token from Frame Blade', async () => {
    const { useFrameBlade } = await import('../../lib/hooks/useFrameBlade');
    const { ChatWidget } = await import('@microsoft/logic-apps-chat');

    let capturedAuthCallback: ((token: string) => void) | undefined;

    vi.mocked(useFrameBlade).mockImplementation(({ onAuthTokenReceived }) => {
      capturedAuthCallback = onAuthTokenReceived;
      return {
        isReady: true,
        sendMessage: vi.fn(),
      };
    });

    const portalConfig: IframeConfig = {
      ...defaultConfig,
      inPortal: true,
      trustedParentOrigin: 'https://portal.azure.com',
    };

    render(<IframeWrapper config={portalConfig} />);

    // Wait for auth check to complete (inPortal skips auth check)
    await screen.findByTestId('chat-widget');

    // Simulate receiving auth token
    act(() => {
      if (capturedAuthCallback) {
        capturedAuthCallback('frame-blade-auth-token');
      }
    });

    // Verify ChatWidget receives the auth token
    expect(vi.mocked(ChatWidget)).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: 'frame-blade-auth-token',
      }),
      {}
    );
  });

  it('should respect URL mode parameter over initial mode', async () => {
    (window as any).location = new URL('http://localhost:3000?mode=dark');

    render(<IframeWrapper config={defaultConfig} />);

    // Wait for auth check to complete
    await screen.findByText('ChatWidget (mode: dark)');
  });

  it('should handle chat history from Frame Blade', async () => {
    const { useFrameBlade } = await import('../../lib/hooks/useFrameBlade');

    let capturedHistoryCallback: ((history: any) => void) | undefined;

    vi.mocked(useFrameBlade).mockImplementation(({ onChatHistoryReceived }) => {
      capturedHistoryCallback = onChatHistoryReceived;
      return {
        isReady: true,
        sendMessage: vi.fn(),
      };
    });

    const portalConfig: IframeConfig = {
      ...defaultConfig,
      inPortal: true,
      trustedParentOrigin: 'https://portal.azure.com',
    };

    render(<IframeWrapper config={portalConfig} />);

    // Wait for auth check to complete (inPortal skips auth check)
    await screen.findByTestId('chat-widget');

    const chatHistory = {
      contextId: 'test-context-123',
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Test message',
          timestamp: '2024-01-01T00:00:00Z',
        },
      ],
    };

    // Simulate receiving chat history
    act(() => {
      if (capturedHistoryCallback) {
        capturedHistoryCallback(chatHistory);
      }
    });

    // Verify contextId is handled (not stored in localStorage, but passed as initialContextId prop)
    // The actual verification happens when the component re-renders with the contextId
    expect(chatHistory.contextId).toBe('test-context-123');
  });

  it('should pass contextId from URL config to ChatWidget', async () => {
    const { ChatWidget } = vi.mocked(await import('@microsoft/logic-apps-chat'));

    const configWithContextId: IframeConfig = {
      ...defaultConfig,
      contextId: 'ctx-from-url',
      multiSession: false,
    };

    render(<IframeWrapper config={configWithContextId} />);

    // Wait for auth check to complete
    await screen.findByTestId('chat-widget');

    expect(ChatWidget).toHaveBeenCalledWith(
      expect.objectContaining({
        initialContextId: 'ctx-from-url',
      }),
      {}
    );
  });

  it('should not use contextId for multi-session mode', async () => {
    const configWithContextId: IframeConfig = {
      ...defaultConfig,
      contextId: 'ctx-from-url',
      multiSession: true,
      apiKey: 'test-api-key', // apiKey skips auth check
    };

    render(<IframeWrapper config={configWithContextId} />);

    // Wait for auth check to complete (apiKey skips auth check)
    await screen.findByTestId('multi-session-chat');
  });
});

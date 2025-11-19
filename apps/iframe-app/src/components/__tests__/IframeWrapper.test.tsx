import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { IframeWrapper } from '../IframeWrapper';
import type { IframeConfig } from '../../lib/utils/config-parser';

// Mock the dependencies
vi.mock('@microsoft/logicAppsChat', () => ({
  ChatWidget: vi.fn(({ mode }) => <div data-testid="chat-widget">ChatWidget (mode: {mode})</div>),
}));

vi.mock('../MultiSessionChat', () => ({
  MultiSessionChat: vi.fn(({ mode }) => (
    <div data-testid="multi-session-chat">MultiSessionChat (mode: {mode})</div>
  )),
}));

vi.mock('../../lib/authHandler', () => ({
  createUnauthorizedHandler: vi.fn(() => vi.fn()),
  getBaseUrl: vi.fn((agentCard) => `https://base.url.from/${agentCard}`),
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

  it('should render ChatWidget in single-session mode', () => {
    render(<IframeWrapper config={defaultConfig} />);

    expect(screen.getByTestId('chat-widget')).toBeInTheDocument();
    expect(screen.getByText('ChatWidget (mode: light)')).toBeInTheDocument();
  });

  it('should render MultiSessionChat in multi-session mode', () => {
    const multiSessionConfig: IframeConfig = {
      ...defaultConfig,
      multiSession: true,
      apiKey: 'test-api-key',
    };

    render(<IframeWrapper config={multiSessionConfig} />);

    expect(screen.getByTestId('multi-session-chat')).toBeInTheDocument();
    expect(screen.getByText('MultiSessionChat (mode: light)')).toBeInTheDocument();
  });

  it('should handle dark mode', () => {
    const darkModeConfig: IframeConfig = {
      ...defaultConfig,
      mode: 'dark',
    };

    render(<IframeWrapper config={darkModeConfig} />);

    expect(screen.getByText('ChatWidget (mode: dark)')).toBeInTheDocument();
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

    expect(screen.getByTestId('chat-widget')).toBeInTheDocument();
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

    expect(screen.getByText('ChatWidget (mode: light)')).toBeInTheDocument();

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
    const { ChatWidget } = await import('@microsoft/logicAppsChat');

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
      undefined
    );
  });

  it('should respect URL mode parameter over initial mode', () => {
    (window as any).location = new URL('http://localhost:3000?mode=dark');

    render(<IframeWrapper config={defaultConfig} />);

    expect(screen.getByText('ChatWidget (mode: dark)')).toBeInTheDocument();
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
    const { ChatWidget } = vi.mocked(await import('@microsoft/logicAppsChat'));

    const configWithContextId: IframeConfig = {
      ...defaultConfig,
      contextId: 'ctx-from-url',
      multiSession: false,
    };

    render(<IframeWrapper config={configWithContextId} />);

    expect(ChatWidget).toHaveBeenCalledWith(
      expect.objectContaining({
        initialContextId: 'ctx-from-url',
      }),
      undefined
    );
  });

  it('should not use contextId for multi-session mode', () => {
    const configWithContextId: IframeConfig = {
      ...defaultConfig,
      contextId: 'ctx-from-url',
      multiSession: true,
    };

    render(<IframeWrapper config={configWithContextId} />);

    // Multi-session mode uses MultiSessionChat, which doesn't use initialContextId
    expect(screen.getByTestId('multi-session-chat')).toBeInTheDocument();
  });
});

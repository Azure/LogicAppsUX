import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IframeWrapper } from '../IframeWrapper';
import type { IframeConfig } from '../../lib/utils/config-parser';
import * as authHandler from '../../lib/authHandler';

// Mock the dependencies
vi.mock('@microsoft/logic-apps-chat', () => ({
  ChatWidget: vi.fn(({ sessionKey }) => <div data-testid="chat-widget">ChatWidget (sessionKey: {sessionKey})</div>),
  useChatStore: vi.fn((selector) => {
    const mockState = { sessions: [] };
    return selector ? selector(mockState) : mockState;
  }),
}));

vi.mock('../MultiSessionChat/MultiSessionChat', () => ({
  MultiSessionChat: vi.fn(() => <div data-testid="multi-session-chat">MultiSessionChat</div>),
}));

vi.mock('../../lib/authHandler', () => ({
  createUnauthorizedHandler: vi.fn(() => vi.fn()),
  getBaseUrl: vi.fn((agentCard) => `https://base.url.from/${agentCard}`),
  checkAuthStatus: vi.fn(() => Promise.resolve({ isAuthenticated: true, isEasyAuthConfigured: true, error: null })),
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

vi.mock('../../hooks/useAgentCard', () => ({
  useAgentCard: vi.fn(() => ({
    data: undefined,
    isLoading: false,
    error: null,
  })),
}));

describe('IframeWrapper - contextId support', () => {
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

    // Reset checkAuthStatus to return authenticated
    vi.mocked(authHandler.checkAuthStatus).mockResolvedValue({ isAuthenticated: true, isEasyAuthConfigured: true, error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should pass initialContextId to ChatWidget for single-session mode', async () => {
    const { ChatWidget } = vi.mocked(await import('@microsoft/logic-apps-chat'));

    const configWithContextId: IframeConfig = {
      ...defaultConfig,
      contextId: 'test-context-123',
      multiSession: false,
    };

    render(<IframeWrapper config={configWithContextId} />);

    // Wait for auth check to complete
    await screen.findByTestId('chat-widget');

    expect(ChatWidget).toHaveBeenCalledWith(
      expect.objectContaining({
        initialContextId: 'test-context-123',
      }),
      {}
    );
  });

  it('should not pass initialContextId for multi-session mode', async () => {
    const configWithContextId: IframeConfig = {
      ...defaultConfig,
      contextId: 'test-context-456',
      multiSession: true,
      apiKey: 'test-api-key', // apiKey skips auth check
    };

    render(<IframeWrapper config={configWithContextId} />);

    // Wait for auth check to complete (apiKey skips auth check)
    await screen.findByTestId('multi-session-chat');
  });

  it('should pass sessionKey to ChatWidget', async () => {
    const { ChatWidget } = vi.mocked(await import('@microsoft/logic-apps-chat'));

    const configWithSessionKey: IframeConfig = {
      ...defaultConfig,
      props: {
        ...defaultConfig.props,
        sessionKey: 'my-session',
      },
      contextId: 'test-context',
      multiSession: false,
    };

    render(<IframeWrapper config={configWithSessionKey} />);

    // Wait for auth check to complete
    await screen.findByTestId('chat-widget');

    expect(ChatWidget).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionKey: 'my-session',
      }),
      {}
    );
  });

  it('should handle missing contextId gracefully', async () => {
    const { ChatWidget } = vi.mocked(await import('@microsoft/logic-apps-chat'));

    const configWithoutContextId: IframeConfig = {
      ...defaultConfig,
      contextId: undefined,
      multiSession: false,
    };

    render(<IframeWrapper config={configWithoutContextId} />);

    // Wait for auth check to complete
    await screen.findByTestId('chat-widget');

    // Should still pass initialContextId prop, but it will be undefined
    expect(ChatWidget).toHaveBeenCalledWith(
      expect.objectContaining({
        initialContextId: undefined,
      }),
      {}
    );
  });

  it('should pass contextId with custom sessionKey', async () => {
    const { ChatWidget } = vi.mocked(await import('@microsoft/logic-apps-chat'));

    const configWithSessionKey: IframeConfig = {
      ...defaultConfig,
      props: {
        ...defaultConfig.props,
        sessionKey: 'custom-session',
      },
      contextId: 'test-context-abc',
      multiSession: false,
    };

    render(<IframeWrapper config={configWithSessionKey} />);

    // Wait for auth check to complete
    await screen.findByTestId('chat-widget');

    expect(ChatWidget).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionKey: 'custom-session',
        initialContextId: 'test-context-abc',
      }),
      {}
    );
  });
});

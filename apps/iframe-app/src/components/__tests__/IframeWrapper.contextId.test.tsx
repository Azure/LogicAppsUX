import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IframeWrapper } from '../IframeWrapper';
import type { IframeConfig } from '../../lib/utils/config-parser';

// Mock the dependencies
vi.mock('@microsoft/logicAppsChat', () => ({
  ChatWidget: vi.fn(({ sessionKey }) => (
    <div data-testid="chat-widget">ChatWidget (sessionKey: {sessionKey})</div>
  )),
}));

vi.mock('../MultiSessionChat', () => ({
  MultiSessionChat: vi.fn(() => <div data-testid="multi-session-chat">MultiSessionChat</div>),
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should pass initialContextId to ChatWidget for single-session mode', async () => {
    const { ChatWidget } = vi.mocked(await import('@microsoft/logicAppsChat'));

    const configWithContextId: IframeConfig = {
      ...defaultConfig,
      contextId: 'test-context-123',
      multiSession: false,
    };

    render(<IframeWrapper config={configWithContextId} />);

    expect(ChatWidget).toHaveBeenCalledWith(
      expect.objectContaining({
        initialContextId: 'test-context-123',
      }),
      undefined
    );
  });

  it('should not pass initialContextId for multi-session mode', async () => {
    const configWithContextId: IframeConfig = {
      ...defaultConfig,
      contextId: 'test-context-456',
      multiSession: true,
    };

    render(<IframeWrapper config={configWithContextId} />);

    // Multi-session mode uses MultiSessionChat, not ChatWidget
    expect(screen.getByTestId('multi-session-chat')).toBeInTheDocument();
  });

  it('should pass sessionKey to ChatWidget', async () => {
    const { ChatWidget } = vi.mocked(await import('@microsoft/logicAppsChat'));

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

    expect(ChatWidget).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionKey: 'my-session',
      }),
      undefined
    );
  });

  it('should handle missing contextId gracefully', async () => {
    const { ChatWidget } = vi.mocked(await import('@microsoft/logicAppsChat'));

    const configWithoutContextId: IframeConfig = {
      ...defaultConfig,
      contextId: undefined,
      multiSession: false,
    };

    render(<IframeWrapper config={configWithoutContextId} />);

    expect(screen.getByTestId('chat-widget')).toBeInTheDocument();

    // Should still pass initialContextId prop, but it will be undefined
    expect(ChatWidget).toHaveBeenCalledWith(
      expect.objectContaining({
        initialContextId: undefined,
      }),
      undefined
    );
  });

  it('should pass contextId with custom sessionKey', async () => {
    const { ChatWidget } = vi.mocked(await import('@microsoft/logicAppsChat'));

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

    expect(ChatWidget).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionKey: 'custom-session',
        initialContextId: 'test-context-abc',
      }),
      undefined
    );
  });
});

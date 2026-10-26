import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useParentCommunication } from '../useParentCommunication';

vi.mock('../../utils/origin-validator', () => ({
  getAllowedOrigins: vi.fn((trustedParentOrigin?: string) => [
    'http://localhost:3000',
    'https://parent.example.com',
    ...(trustedParentOrigin ? [trustedParentOrigin] : []),
  ]),
  isOriginAllowed: vi.fn((origin: string, allowedOrigins: string[]) => allowedOrigins.includes(origin)),
  getParentOrigin: vi.fn((trustedParentOrigin?: string) => trustedParentOrigin ?? 'https://parent.example.com'),
}));

describe('useParentCommunication', () => {
  let parentWindow: Window;
  let mockPostMessage: ReturnType<typeof vi.fn>;
  let messageListeners: Array<(event: MessageEvent) => void>;

  beforeEach(() => {
    mockPostMessage = vi.fn();
    parentWindow = { postMessage: mockPostMessage } as unknown as Window;
    Object.defineProperty(window, 'parent', {
      value: parentWindow,
      configurable: true,
    });

    messageListeners = [];
    vi.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
      if (event === 'message') {
        messageListeners.push(handler as (event: MessageEvent) => void);
      }
    });
    vi.spyOn(window, 'removeEventListener').mockImplementation((event, handler) => {
      if (event === 'message') {
        const index = messageListeners.indexOf(handler as (event: MessageEvent) => void);
        if (index >= 0) {
          messageListeners.splice(index, 1);
        }
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const dispatchMessage = (data: unknown, origin = 'https://parent.example.com', source: MessageEventSource = parentWindow) => {
    const event = new MessageEvent('message', { origin, data, source });
    act(() => {
      messageListeners.forEach((listener) => listener(event));
    });
  };

  it('does not wait for an agent card when disabled', () => {
    const { result } = renderHook(() => useParentCommunication({ enabled: false }));

    expect(result.current.isWaitingForAgentCard).toBe(false);
  });

  it('waits for an agent card and sends IFRAME_READY when enabled', () => {
    const { result } = renderHook(() => useParentCommunication({ enabled: true }));

    expect(result.current.isWaitingForAgentCard).toBe(true);
    expect(mockPostMessage).toHaveBeenCalledWith({ type: 'IFRAME_READY' }, 'https://parent.example.com');
  });

  it('uses the trusted parent origin for outbound messages', () => {
    const { result } = renderHook(() =>
      useParentCommunication({
        enabled: true,
        trustedParentOrigin: 'https://portal.azure.com',
      })
    );

    expect(mockPostMessage).toHaveBeenCalledWith({ type: 'IFRAME_READY' }, 'https://portal.azure.com');

    result.current.sendMessageToParent({ type: 'CUSTOM_MESSAGE' });

    expect(mockPostMessage).toHaveBeenLastCalledWith({ type: 'CUSTOM_MESSAGE' }, 'https://portal.azure.com');
  });

  it.each([
    ['string', 'https://agent.logic.azure.com/.well-known/agent-card.json'],
    ['object', { name: 'Test Agent', url: 'https://agent.logic-apps.azure.com/rpc' }],
  ])('accepts a valid Microsoft HTTPS %s agent card', (_shape, agentCard) => {
    const onAgentCardReceived = vi.fn();
    const { result } = renderHook(() =>
      useParentCommunication({
        enabled: true,
        onAgentCardReceived,
      })
    );
    mockPostMessage.mockClear();

    dispatchMessage({ type: 'SET_AGENT_CARD', agentCard });

    expect(onAgentCardReceived).toHaveBeenCalledWith(agentCard);
    expect(result.current.isWaitingForAgentCard).toBe(false);
    expect(mockPostMessage).toHaveBeenCalledWith({ type: 'AGENT_CARD_RECEIVED' }, 'https://parent.example.com');
  });

  it.each([
    ['external URL', 'https://attacker.example/agent-card.json'],
    ['HTTP URL', 'http://agent.logic.azure.com/agent-card.json'],
    ['malformed URL', 'not-a-url'],
    ['object without URL', { name: 'Missing URL' }],
    ['object with a non-string URL', { url: 42 }],
  ])('rejects an agent card with an %s without side effects', (_case, agentCard) => {
    const onAgentCardReceived = vi.fn();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { result } = renderHook(() =>
      useParentCommunication({
        enabled: true,
        onAgentCardReceived,
      })
    );
    mockPostMessage.mockClear();

    dispatchMessage({ type: 'SET_AGENT_CARD', agentCard });

    expect(onAgentCardReceived).not.toHaveBeenCalled();
    expect(result.current.isWaitingForAgentCard).toBe(true);
    expect(mockPostMessage).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith('Ignoring SET_AGENT_CARD message with an invalid agent card:', expect.any(String));
  });

  it('rejects SET_AGENT_CARD from a non-parent source without side effects', () => {
    const onAgentCardReceived = vi.fn();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { result } = renderHook(() =>
      useParentCommunication({
        enabled: true,
        onAgentCardReceived,
      })
    );
    mockPostMessage.mockClear();

    dispatchMessage({ type: 'SET_AGENT_CARD', agentCard: 'https://agent.logic.azure.com/agent-card.json' }, 'https://parent.example.com', {
      postMessage: vi.fn(),
    } as unknown as Window);

    expect(onAgentCardReceived).not.toHaveBeenCalled();
    expect(result.current.isWaitingForAgentCard).toBe(true);
    expect(mockPostMessage).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith('Ignoring SET_AGENT_CARD message from an unexpected source.');
  });

  it('rejects SET_AGENT_CARD from an untrusted origin without side effects', () => {
    const onAgentCardReceived = vi.fn();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { result } = renderHook(() =>
      useParentCommunication({
        enabled: true,
        onAgentCardReceived,
      })
    );
    mockPostMessage.mockClear();

    dispatchMessage({ type: 'SET_AGENT_CARD', agentCard: 'https://agent.logic.azure.com/agent-card.json' }, 'https://untrusted.example');

    expect(onAgentCardReceived).not.toHaveBeenCalled();
    expect(result.current.isWaitingForAgentCard).toBe(true);
    expect(mockPostMessage).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith('Ignoring SET_AGENT_CARD message from an untrusted origin:', 'https://untrusted.example');
  });

  it('ignores unrelated messages', () => {
    const onAgentCardReceived = vi.fn();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    renderHook(() =>
      useParentCommunication({
        enabled: true,
        onAgentCardReceived,
      })
    );
    mockPostMessage.mockClear();

    dispatchMessage({ type: 'OTHER_MESSAGE' });

    expect(onAgentCardReceived).not.toHaveBeenCalled();
    expect(mockPostMessage).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('allows an explicit target origin for outbound messages', () => {
    const { result } = renderHook(() => useParentCommunication({ enabled: true }));

    result.current.sendMessageToParent({ type: 'CUSTOM_MESSAGE' }, 'https://custom.example.com');

    expect(mockPostMessage).toHaveBeenLastCalledWith({ type: 'CUSTOM_MESSAGE' }, 'https://custom.example.com');
  });

  it('does not send messages when window.parent equals window', () => {
    Object.defineProperty(window, 'parent', {
      value: window,
      configurable: true,
    });
    const { result } = renderHook(() => useParentCommunication({ enabled: true }));
    mockPostMessage.mockClear();

    result.current.sendMessageToParent({ type: 'TEST' });

    expect(mockPostMessage).not.toHaveBeenCalled();
  });

  it('cleans up the message listener on unmount', () => {
    const { unmount } = renderHook(() => useParentCommunication({ enabled: true }));

    expect(messageListeners).toHaveLength(1);

    unmount();

    expect(messageListeners).toHaveLength(0);
  });
});

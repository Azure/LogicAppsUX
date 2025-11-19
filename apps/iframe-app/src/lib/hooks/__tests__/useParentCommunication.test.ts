import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useParentCommunication } from '../useParentCommunication';

// Mock the origin validator module
vi.mock('../../utils/origin-validator', () => ({
  getAllowedOrigins: vi.fn(() => ['http://localhost:3000', 'https://parent.example.com']),
  isOriginAllowed: vi.fn((origin, allowed) => allowed.includes(origin)),
  getParentOrigin: vi.fn(() => 'https://parent.example.com'),
}));

describe('useParentCommunication', () => {
  let mockPostMessage: ReturnType<typeof vi.fn>;
  let messageListeners: Array<(event: MessageEvent) => void> = [];

  beforeEach(() => {
    // Mock window.parent.postMessage
    mockPostMessage = vi.fn();
    window.parent = {
      postMessage: mockPostMessage,
    } as any;

    // Make window.parent different from window
    Object.defineProperty(window, 'parent', {
      value: { postMessage: mockPostMessage },
      configurable: true,
    });

    // Capture event listeners
    messageListeners = [];
    window.addEventListener = vi.fn((event, handler) => {
      if (event === 'message') {
        messageListeners.push(handler as any);
      }
    }) as any;

    window.removeEventListener = vi.fn((event, handler) => {
      if (event === 'message') {
        const index = messageListeners.indexOf(handler as any);
        if (index > -1) {
          messageListeners.splice(index, 1);
        }
      }
    }) as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should not wait for agent card when disabled', () => {
    const { result } = renderHook(() =>
      useParentCommunication({
        enabled: false,
      })
    );

    expect(result.current.isWaitingForAgentCard).toBe(false);
  });

  it('should wait for agent card when enabled', () => {
    const { result } = renderHook(() =>
      useParentCommunication({
        enabled: true,
      })
    );

    expect(result.current.isWaitingForAgentCard).toBe(true);
  });

  it('should send IFRAME_READY message when enabled', () => {
    renderHook(() =>
      useParentCommunication({
        enabled: true,
      })
    );

    expect(mockPostMessage).toHaveBeenCalledWith(
      { type: 'IFRAME_READY' },
      'https://parent.example.com'
    );
  });

  it('should handle SET_AGENT_CARD message', () => {
    const onAgentCardReceived = vi.fn();
    const mockSource = {
      postMessage: vi.fn(),
    };

    const { result } = renderHook(() =>
      useParentCommunication({
        enabled: true,
        onAgentCardReceived,
      })
    );

    expect(result.current.isWaitingForAgentCard).toBe(true);

    // Simulate agent card message
    const agentCard = { name: 'Test Agent', endpoint: 'https://api.example.com' };
    const event = new MessageEvent('message', {
      origin: 'https://parent.example.com',
      data: {
        type: 'SET_AGENT_CARD',
        agentCard,
      },
      source: mockSource as any,
    });

    act(() => {
      messageListeners.forEach((listener) => listener(event));
    });

    expect(onAgentCardReceived).toHaveBeenCalledWith(agentCard);
    expect(result.current.isWaitingForAgentCard).toBe(false);
    expect(mockSource.postMessage).toHaveBeenCalledWith(
      { type: 'AGENT_CARD_RECEIVED' },
      'https://parent.example.com'
    );
  });

  it('should ignore messages from untrusted origins', () => {
    const onAgentCardReceived = vi.fn();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    renderHook(() =>
      useParentCommunication({
        enabled: true,
        onAgentCardReceived,
      })
    );

    // Simulate message from untrusted origin
    const event = new MessageEvent('message', {
      origin: 'https://untrusted.com',
      data: {
        type: 'SET_AGENT_CARD',
        agentCard: {},
      },
    });

    act(() => {
      messageListeners.forEach((listener) => listener(event));
    });

    expect(onAgentCardReceived).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      'Ignoring message from untrusted origin:',
      'https://untrusted.com'
    );

    warnSpy.mockRestore();
  });

  it('should ignore non-SET_AGENT_CARD messages', () => {
    const onAgentCardReceived = vi.fn();

    renderHook(() =>
      useParentCommunication({
        enabled: true,
        onAgentCardReceived,
      })
    );

    // Simulate different message type
    const event = new MessageEvent('message', {
      origin: 'https://parent.example.com',
      data: {
        type: 'OTHER_MESSAGE',
        data: {},
      },
    });

    act(() => {
      messageListeners.forEach((listener) => listener(event));
    });

    expect(onAgentCardReceived).not.toHaveBeenCalled();
  });

  it('should provide sendMessageToParent function', () => {
    const { result } = renderHook(() =>
      useParentCommunication({
        enabled: true,
      })
    );

    const message = { type: 'CUSTOM_MESSAGE', data: 'test' };

    act(() => {
      result.current.sendMessageToParent(message);
    });

    expect(mockPostMessage).toHaveBeenCalledWith(message, 'https://parent.example.com');
  });

  it('should allow custom target origin in sendMessageToParent', () => {
    const { result } = renderHook(() =>
      useParentCommunication({
        enabled: true,
      })
    );

    const message = { type: 'CUSTOM_MESSAGE', data: 'test' };
    const customOrigin = 'https://custom.example.com';

    act(() => {
      result.current.sendMessageToParent(message, customOrigin);
    });

    expect(mockPostMessage).toHaveBeenCalledWith(message, customOrigin);
  });

  it('should not send messages when window.parent equals window', () => {
    // Make window.parent equal to window
    Object.defineProperty(window, 'parent', {
      value: window,
      configurable: true,
    });

    const { result } = renderHook(() =>
      useParentCommunication({
        enabled: true,
      })
    );

    mockPostMessage.mockClear();

    act(() => {
      result.current.sendMessageToParent({ type: 'TEST' });
    });

    expect(mockPostMessage).not.toHaveBeenCalled();
  });

  it('should clean up event listeners on unmount', () => {
    const { unmount } = renderHook(() =>
      useParentCommunication({
        enabled: true,
      })
    );

    expect(messageListeners.length).toBe(1);

    unmount();

    expect(window.removeEventListener).toHaveBeenCalledWith('message', expect.any(Function));
  });
});

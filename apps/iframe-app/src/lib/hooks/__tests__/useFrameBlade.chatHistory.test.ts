import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFrameBlade } from '../useFrameBlade';
import type { ChatHistoryData } from '../../types/chat-history';

describe('useFrameBlade - chat history support', () => {
  let mockPostMessage: ReturnType<typeof vi.fn>;
  let messageListeners: Array<(event: MessageEvent) => void> = [];

  beforeEach(() => {
    // Mock window.parent.postMessage
    mockPostMessage = vi.fn();
    window.parent = {
      postMessage: mockPostMessage,
    } as any;

    // Mock location.hash
    delete (window as any).location;
    (window as any).location = {
      ...window.location,
      hash: '#session123',
    };

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

    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should handle chat history messages', () => {
    const onChatHistoryReceived = vi.fn();

    renderHook(() =>
      useFrameBlade({
        enabled: true,
        trustedParentOrigin: 'https://portal.azure.com',
        onChatHistoryReceived,
      })
    );

    const chatHistory: ChatHistoryData = {
      contextId: 'test-context-123',
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          timestamp: '2024-01-15T10:00:00Z',
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: 'Hi there! How can I help you?',
          timestamp: '2024-01-15T10:00:05Z',
        },
      ],
      sessionMetadata: {
        startedAt: '2024-01-15T10:00:00Z',
      },
    };

    // Simulate chat history message
    const event = new MessageEvent('message', {
      origin: 'https://portal.azure.com',
      data: {
        signature: 'FxFrameBlade',
        kind: 'chatHistory',
        data: chatHistory,
      },
    });

    act(() => {
      messageListeners.forEach((listener) => listener(event));
    });

    expect(onChatHistoryReceived).toHaveBeenCalledWith(chatHistory);
  });

  it('should ignore chat history messages from untrusted origins', () => {
    const onChatHistoryReceived = vi.fn();

    renderHook(() =>
      useFrameBlade({
        enabled: true,
        trustedParentOrigin: 'https://portal.azure.com',
        onChatHistoryReceived,
      })
    );

    const chatHistory: ChatHistoryData = {
      contextId: 'test-context-123',
      messages: [],
    };

    // Simulate message from untrusted origin
    const event = new MessageEvent('message', {
      origin: 'https://untrusted.com',
      data: {
        signature: 'FxFrameBlade',
        kind: 'chatHistory',
        data: chatHistory,
      },
    });

    act(() => {
      messageListeners.forEach((listener) => listener(event));
    });

    expect(onChatHistoryReceived).not.toHaveBeenCalled();
  });

  it('should handle chat history with metadata and artifacts', () => {
    const onChatHistoryReceived = vi.fn();

    renderHook(() =>
      useFrameBlade({
        enabled: true,
        trustedParentOrigin: 'https://portal.azure.com',
        onChatHistoryReceived,
      })
    );

    const chatHistory: ChatHistoryData = {
      contextId: 'test-context-456',
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Can you show me some code?',
          timestamp: '2024-01-15T10:00:00Z',
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: 'Here is an example:',
          timestamp: '2024-01-15T10:00:05Z',
          metadata: {
            artifacts: [
              {
                id: 'artifact-1',
                type: 'code',
                title: 'Example.ts',
                content: 'console.log("Hello World");',
              },
            ],
          },
        },
      ],
      sessionMetadata: {
        startedAt: '2024-01-15T10:00:00Z',
        lastActivityAt: '2024-01-15T10:00:05Z',
        customField: 'custom-value',
      },
    };

    // Simulate chat history message
    const event = new MessageEvent('message', {
      origin: 'https://portal.azure.com',
      data: {
        signature: 'FxFrameBlade',
        kind: 'chatHistory',
        data: chatHistory,
      },
    });

    act(() => {
      messageListeners.forEach((listener) => listener(event));
    });

    expect(onChatHistoryReceived).toHaveBeenCalledWith(chatHistory);
    const receivedHistory = onChatHistoryReceived.mock.calls[0][0];
    expect(receivedHistory.messages[1].metadata?.artifacts).toHaveLength(1);
    expect(receivedHistory.sessionMetadata?.customField).toBe('custom-value');
  });

  it('should not call handler if chat history data is missing', () => {
    const onChatHistoryReceived = vi.fn();

    renderHook(() =>
      useFrameBlade({
        enabled: true,
        trustedParentOrigin: 'https://portal.azure.com',
        onChatHistoryReceived,
      })
    );

    // Simulate message without data
    const event = new MessageEvent('message', {
      origin: 'https://portal.azure.com',
      data: {
        signature: 'FxFrameBlade',
        kind: 'chatHistory',
        // data is missing
      },
    });

    act(() => {
      messageListeners.forEach((listener) => listener(event));
    });

    expect(onChatHistoryReceived).not.toHaveBeenCalled();
  });

  it('should log when chat history is received', () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const onChatHistoryReceived = vi.fn();

    renderHook(() =>
      useFrameBlade({
        enabled: true,
        trustedParentOrigin: 'https://portal.azure.com',
        onChatHistoryReceived,
      })
    );

    const chatHistory: ChatHistoryData = {
      contextId: 'test-context-789',
      messages: [],
    };

    // Simulate chat history message
    const event = new MessageEvent('message', {
      origin: 'https://portal.azure.com',
      data: {
        signature: 'FxFrameBlade',
        kind: 'chatHistory',
        data: chatHistory,
      },
    });

    act(() => {
      messageListeners.forEach((listener) => listener(event));
    });

    expect(consoleLogSpy).toHaveBeenCalledWith('Received chat history from parent blade');

    consoleLogSpy.mockRestore();
  });
});

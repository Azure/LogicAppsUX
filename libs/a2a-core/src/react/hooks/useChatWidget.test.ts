import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChatWidget } from './useChatWidget';

// Mock the dependencies
vi.mock('../use-a2a', () => ({
  useA2A: vi.fn(() => ({
    isConnected: false,
    isLoading: false,
    messages: [],
    agentCard: null,
    contextId: undefined,
    connect: vi.fn(),
    disconnect: vi.fn(),
    sendMessage: vi.fn(),
    clearMessages: vi.fn(),
  })),
}));

vi.mock('../../discovery/agent-discovery', () => ({
  AgentDiscovery: vi.fn(() => ({
    fromWellKnownUri: vi.fn(),
    fromDirect: vi.fn(),
  })),
}));

vi.mock('../utils/messageUtils', () => ({
  createMessage: vi.fn((content, role) => ({
    id: `msg-${Date.now()}`,
    content,
    sender: role,
    timestamp: new Date(),
    status: 'sending',
  })),
}));

vi.mock('../store/chatStore', () => ({
  useChatStore: vi.fn(() => ({
    addMessage: vi.fn(),
    updateMessage: vi.fn(),
    setConnected: vi.fn(),
    setTyping: vi.fn(),
    clearMessages: vi.fn(),
  })),
}));

describe('useChatWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() =>
      useChatWidget({
        agentCard: 'https://example.com/agent',
      })
    );

    expect(result.current.isConnected).toBe(false);
    expect(result.current.isTyping).toBe(false);
    expect(result.current.agentName).toBe('Agent');
  });

  it('should handle connection changes', async () => {
    const onConnectionChange = vi.fn();
    const { useA2A } = await import('../use-a2a');
    const { useChatStore } = await import('../store/chatStore');

    const setConnected = vi.fn();
    (useChatStore as any).mockReturnValue({
      addMessage: vi.fn(),
      updateMessage: vi.fn(),
      setConnected,
      setTyping: vi.fn(),
      clearMessages: vi.fn(),
    });

    (useA2A as any).mockReturnValue({
      isConnected: true,
      isLoading: false,
      messages: [],
      agentCard: { name: 'Test Agent' },
      contextId: 'ctx-123',
      connect: vi.fn(),
      disconnect: vi.fn(),
      sendMessage: vi.fn(),
      clearMessages: vi.fn(),
    });

    const { result } = renderHook(() =>
      useChatWidget({
        agentCard: 'https://example.com/agent',
        onConnectionChange,
      })
    );

    expect(result.current.isConnected).toBe(true);
    expect(result.current.agentName).toBe('Test Agent');
    expect(result.current.contextId).toBe('ctx-123');
    expect(setConnected).toHaveBeenCalledWith(true);
    expect(onConnectionChange).toHaveBeenCalledWith(true);
  });

  it('should handle typing state changes', async () => {
    const { useA2A } = await import('../use-a2a');
    const { useChatStore } = await import('../store/chatStore');

    const setTyping = vi.fn();
    (useChatStore as any).mockReturnValue({
      addMessage: vi.fn(),
      updateMessage: vi.fn(),
      setConnected: vi.fn(),
      setTyping,
      clearMessages: vi.fn(),
    });

    (useA2A as any).mockReturnValue({
      isConnected: false,
      isLoading: true,
      messages: [],
      agentCard: null,
      contextId: undefined,
      connect: vi.fn(),
      disconnect: vi.fn(),
      sendMessage: vi.fn(),
      clearMessages: vi.fn(),
    });

    const { result } = renderHook(() =>
      useChatWidget({
        agentCard: 'https://example.com/agent',
      })
    );

    expect(result.current.isTyping).toBe(true);
    expect(setTyping).toHaveBeenCalledWith(true, undefined);
  });

  it('should send messages through SDK', async () => {
    const { useA2A } = await import('../use-a2a');
    const { useChatStore } = await import('../store/chatStore');
    const { createMessage } = await import('../utils/messageUtils');

    const mockSendMessage = vi.fn();
    const mockAddMessage = vi.fn();
    const mockUpdateMessage = vi.fn();

    (useChatStore as any).mockReturnValue({
      addMessage: mockAddMessage,
      updateMessage: mockUpdateMessage,
      setConnected: vi.fn(),
      setTyping: vi.fn(),
      clearMessages: vi.fn(),
    });

    (useA2A as any).mockReturnValue({
      isConnected: true,
      isLoading: false,
      messages: [],
      agentCard: null,
      contextId: undefined,
      connect: vi.fn(),
      disconnect: vi.fn(),
      sendMessage: mockSendMessage,
      clearMessages: vi.fn(),
    });

    const { result } = renderHook(() =>
      useChatWidget({
        agentCard: 'https://example.com/agent',
      })
    );

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    expect(createMessage).toHaveBeenCalledWith('Hello', 'user');
    expect(mockAddMessage).toHaveBeenCalled();
    expect(mockSendMessage).toHaveBeenCalledWith('Hello');
    expect(mockUpdateMessage).toHaveBeenCalledWith(expect.any(String), { status: 'sent' });
  });

  it('should throw error when not connected', async () => {
    const { useA2A } = await import('../use-a2a');

    (useA2A as any).mockReturnValue({
      isConnected: false,
      isLoading: false,
      messages: [],
      agentCard: null,
      contextId: undefined,
      connect: vi.fn(),
      disconnect: vi.fn(),
      sendMessage: vi.fn(),
      clearMessages: vi.fn(),
    });

    const { result } = renderHook(() =>
      useChatWidget({
        agentCard: 'https://example.com/agent',
      })
    );

    await expect(result.current.sendMessage('Hello')).rejects.toThrow('Not connected to agent');
  });

  it('should handle incoming messages', async () => {
    const onMessage = vi.fn();
    const { useA2A } = await import('../use-a2a');
    const { useChatStore } = await import('../store/chatStore');
    const { createMessage } = await import('../utils/messageUtils');

    const mockAddMessage = vi.fn();

    (useChatStore as any).mockReturnValue({
      addMessage: mockAddMessage,
      updateMessage: vi.fn(),
      setConnected: vi.fn(),
      setTyping: vi.fn(),
      clearMessages: vi.fn(),
    });

    const mockMessage = {
      id: 'sdk-msg-1',
      role: 'assistant',
      content: 'Hello from agent',
      timestamp: new Date(),
      isStreaming: false,
    };

    (useA2A as any).mockReturnValue({
      isConnected: true,
      isLoading: false,
      messages: [mockMessage],
      agentCard: null,
      contextId: undefined,
      connect: vi.fn(),
      disconnect: vi.fn(),
      sendMessage: vi.fn(),
      clearMessages: vi.fn(),
    });

    renderHook(() =>
      useChatWidget({
        agentCard: 'https://example.com/agent',
        onMessage,
      })
    );

    expect(createMessage).toHaveBeenCalledWith('Hello from agent', 'assistant');
    expect(mockAddMessage).toHaveBeenCalled();
    expect(onMessage).toHaveBeenCalled();
  });

  it('should clear session', async () => {
    const { useA2A } = await import('../use-a2a');
    const { useChatStore } = await import('../store/chatStore');

    const mockClearMessages = vi.fn();
    const mockClearLocalMessages = vi.fn();

    (useChatStore as any).mockReturnValue({
      addMessage: vi.fn(),
      updateMessage: vi.fn(),
      setConnected: vi.fn(),
      setTyping: vi.fn(),
      clearMessages: mockClearLocalMessages,
    });

    (useA2A as any).mockReturnValue({
      isConnected: true,
      isLoading: false,
      messages: [],
      agentCard: null,
      contextId: undefined,
      connect: vi.fn(),
      disconnect: vi.fn(),
      sendMessage: vi.fn(),
      clearMessages: mockClearMessages,
    });

    const { result } = renderHook(() =>
      useChatWidget({
        agentCard: 'https://example.com/agent',
      })
    );

    act(() => {
      result.current.clearSession();
    });

    expect(mockClearMessages).toHaveBeenCalled();
    expect(mockClearLocalMessages).toHaveBeenCalled();
  });

  it('should auto-connect with agent card URL', async () => {
    const { useA2A } = await import('../use-a2a');
    const { AgentDiscovery } = await import('../../discovery/agent-discovery');

    const mockConnect = vi.fn();
    const mockFromWellKnownUri = vi.fn().mockResolvedValue({
      name: 'Test Agent',
      url: 'https://example.com/rpc',
      protocolVersion: '0.2.9',
      capabilities: { streaming: true },
    });

    (useA2A as any).mockReturnValue({
      isConnected: false,
      isLoading: false,
      messages: [],
      agentCard: null,
      contextId: undefined,
      connect: mockConnect,
      disconnect: vi.fn(),
      sendMessage: vi.fn(),
      clearMessages: vi.fn(),
    });

    const mockDiscoveryInstance = {
      fromWellKnownUri: mockFromWellKnownUri,
      fromDirect: vi.fn(),
    };

    vi.mocked(AgentDiscovery).mockImplementation(() => mockDiscoveryInstance as any);

    renderHook(() =>
      useChatWidget({
        agentCard: 'https://example.com/agent',
        auth: { type: 'bearer', token: 'test-token' },
      })
    );

    // Give the effect time to run
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockFromWellKnownUri).toHaveBeenCalledWith('https://example.com/agent');
    expect(mockConnect).toHaveBeenCalledWith({
      name: 'Test Agent',
      url: 'https://example.com/rpc',
      protocolVersion: '0.2.9',
      capabilities: { streaming: true },
    });
  });

  it('should auto-connect with agent card object', async () => {
    const { useA2A } = await import('../use-a2a');

    const mockConnect = vi.fn();
    const agentCard = {
      name: 'Test Agent',
      url: 'https://example.com/rpc',
      protocolVersion: '0.2.9',
      capabilities: {
        streaming: true,
        pushNotifications: false,
        stateTransitionHistory: false,
        extensions: [],
      },
    };

    (useA2A as any).mockReturnValue({
      isConnected: false,
      isLoading: false,
      messages: [],
      agentCard: null,
      contextId: undefined,
      connect: mockConnect,
      disconnect: vi.fn(),
      sendMessage: vi.fn(),
      clearMessages: vi.fn(),
    });

    renderHook(() =>
      useChatWidget({
        agentCard,
      })
    );

    // Give the effect time to run
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockConnect).toHaveBeenCalledWith(agentCard);
  });
});

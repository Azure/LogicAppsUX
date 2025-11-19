import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useA2A } from './use-a2a';
import type { AgentCard } from '../types';

// Mock the A2A client
let mockStreamReturnValue: any = {
  async *[Symbol.asyncIterator]() {
    yield {
      id: 'task-1',
      state: 'completed',
      messages: [],
      artifacts: [],
    };
  },
};

vi.mock('../client/a2a-client', () => ({
  A2AClient: vi.fn().mockImplementation(() => ({
    message: {
      stream: vi.fn().mockImplementation(() => mockStreamReturnValue),
    },
    getCapabilities: vi.fn().mockReturnValue({
      streaming: true,
      stateTransitionHistory: true,
    }),
  })),
}));

describe('useA2A', () => {
  const mockAgentCard: AgentCard = {
    name: 'Test Agent',
    description: 'Test agent for testing',
    version: '1.0.0',
    url: 'http://example.com/.well-known/agent-card.json',
    serviceEndpoint: 'http://example.com/agent',
    capabilities: [
      {
        features: ['streaming', 'artifacts'],
        outputModes: ['text', 'structured'],
        inputModes: ['text', 'structured'],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with disconnected state', () => {
    const { result } = renderHook(() => useA2A());

    expect(result.current.isConnected).toBe(false);
    expect(result.current.messages).toEqual([]);
    expect(result.current.agentCard).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('should connect with agent card', async () => {
    const { result } = renderHook(() => useA2A());

    await act(async () => {
      await result.current.connect(mockAgentCard);
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.agentCard).toEqual(mockAgentCard);
  });

  it('should send message and update messages array', async () => {
    // Mock the stream response
    mockStreamReturnValue = {
      async *[Symbol.asyncIterator]() {
        yield {
          id: 'task-1',
          state: 'pending',
          messages: [],
          artifacts: [],
        };
        yield {
          id: 'task-1',
          state: 'running',
          messages: [
            {
              role: 'assistant',
              content: [{ type: 'text', content: 'Hello from agent' }],
            },
          ],
          artifacts: [],
        };
        yield {
          id: 'task-1',
          state: 'completed',
          messages: [
            {
              role: 'assistant',
              content: [{ type: 'text', content: 'Hello from agent' }],
            },
          ],
          artifacts: [],
        };
      },
    };

    const { result } = renderHook(() => useA2A());

    // Connect first
    await act(async () => {
      await result.current.connect(mockAgentCard);
    });

    // Send message
    await act(async () => {
      await result.current.sendMessage('Hello agent');
    });

    // Check that user message was added
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0]).toMatchObject({
      role: 'user',
      content: 'Hello agent',
    });

    // Check that assistant message was added
    expect(result.current.messages[1]).toMatchObject({
      role: 'assistant',
      content: 'Hello from agent',
    });
  });

  it('should handle artifacts in responses', async () => {
    // Mock stream with artifacts
    mockStreamReturnValue = {
      async *[Symbol.asyncIterator]() {
        yield {
          id: 'task-1',
          state: 'completed',
          messages: [
            {
              role: 'assistant',
              content: [{ type: 'text', content: 'Generated code' }],
            },
          ],
          artifacts: [
            {
              artifactId: 'file.js',
              name: 'file.js',
              parts: [
                {
                  kind: 'text',
                  text: 'console.log("Hello");',
                },
              ],
            },
          ],
        };
      },
    };

    const { result } = renderHook(() => useA2A());

    await act(async () => {
      await result.current.connect(mockAgentCard);
    });

    await act(async () => {
      await result.current.sendMessage('Generate code');
    });

    // Should have user message + assistant message + artifact message
    expect(result.current.messages).toHaveLength(3);
    expect(result.current.messages[2].content).toContain('file.js');
    expect(result.current.messages[2].content).toContain('console.log("Hello");');
  });

  it('should handle loading states', async () => {
    // Mock a slow stream
    mockStreamReturnValue = {
      async *[Symbol.asyncIterator]() {
        await new Promise((resolve) => setTimeout(resolve, 100));
        yield {
          id: 'task-1',
          state: 'completed',
          messages: [
            {
              role: 'assistant',
              content: [{ type: 'text', content: 'Response' }],
            },
          ],
          artifacts: [],
        };
      },
    };

    const { result } = renderHook(() => useA2A());

    await act(async () => {
      await result.current.connect(mockAgentCard);
    });

    // Start sending
    let sendPromise: Promise<void>;
    act(() => {
      sendPromise = result.current.sendMessage('Test');
    });

    // Should be loading
    expect(result.current.isLoading).toBe(true);

    // Wait for completion
    await act(async () => {
      await sendPromise!;
    });

    // Should not be loading
    expect(result.current.isLoading).toBe(false);
  });

  it('should disconnect and clear state', async () => {
    // Mock a simple response
    mockStreamReturnValue = {
      async *[Symbol.asyncIterator]() {
        yield {
          id: 'task-1',
          state: 'completed',
          messages: [
            {
              role: 'assistant',
              content: [{ type: 'text', content: 'Test response' }],
            },
          ],
          artifacts: [],
        };
      },
    };

    const { result } = renderHook(() => useA2A());

    await act(async () => {
      await result.current.connect(mockAgentCard);
      await result.current.sendMessage('Test message');
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.messages.length).toBeGreaterThan(0);

    act(() => {
      result.current.disconnect();
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.agentCard).toBeUndefined();
    expect(result.current.messages).toEqual([]);
  });

  it('should handle errors gracefully', async () => {
    // Mock error in stream
    mockStreamReturnValue = {
      async *[Symbol.asyncIterator]() {
        throw new Error('Stream failed');
      },
    };

    const { result } = renderHook(() => useA2A());

    await act(async () => {
      await result.current.connect(mockAgentCard);
    });

    await act(async () => {
      await expect(result.current.sendMessage('Test')).rejects.toThrow('Stream failed');
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('should persist messages to localStorage when persistSession is enabled', async () => {
    const sessionKey = 'test-session';
    const { result } = renderHook(() =>
      useA2A({
        persistSession: true,
        sessionKey,
        agentUrl: 'http://example.com/.well-known/agent-card.json',
      })
    );

    // Setup localStorage mock
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    // Mock the stream response
    mockStreamReturnValue = {
      async *[Symbol.asyncIterator]() {
        yield {
          id: 'task-persist',
          state: 'completed',
          messages: [
            {
              role: 'assistant',
              content: [{ type: 'text', content: 'Response to persist' }],
            },
          ],
          artifacts: [],
        };
      },
    };

    // Connect and send message
    await act(async () => {
      await result.current.connect(mockAgentCard);
      await result.current.sendMessage('Test message');
    });

    // Verify localStorage was called with messages
    const expectedKey = `a2a-messages-example-com-${sessionKey}`;
    expect(setItemSpy).toHaveBeenCalledWith(expectedKey, expect.any(String));

    // Verify messages were stored
    const storedMessages = JSON.parse(localStorage.getItem(expectedKey) || '[]');
    expect(storedMessages).toHaveLength(2);
    expect(storedMessages[0].content).toBe('Test message');
    expect(storedMessages[1].content).toBe('Response to persist');

    setItemSpy.mockRestore();
    localStorage.clear();
  });

  it('should restore messages from localStorage on mount', async () => {
    const sessionKey = 'test-session';
    const agentUrl = 'http://example.com/.well-known/agent-card.json';
    const storageKey = `a2a-messages-example-com-${sessionKey}`;
    const storedMessages = [
      {
        id: 'stored-1',
        role: 'user',
        content: 'Previous message',
        timestamp: new Date().toISOString(),
      },
      {
        id: 'stored-2',
        role: 'assistant',
        content: 'Previous response',
        timestamp: new Date().toISOString(),
      },
    ];

    // Setup localStorage with existing messages
    localStorage.setItem(storageKey, JSON.stringify(storedMessages));

    const { result } = renderHook(() =>
      useA2A({
        persistSession: true,
        sessionKey,
        agentUrl,
      })
    );

    // Connect to load messages from localStorage
    await act(async () => {
      await result.current.connect(mockAgentCard);
    });

    // Messages should be restored
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0].content).toBe('Previous message');
    expect(result.current.messages[1].content).toBe('Previous response');

    // Clean up
    localStorage.clear();
  });

  it('should clear localStorage when clearMessages is called', async () => {
    const sessionKey = 'test-session';
    const { result } = renderHook(() => useA2A({ persistSession: true, sessionKey }));

    // Setup some data
    localStorage.setItem(`a2a-messages-${sessionKey}`, JSON.stringify([{ test: 'message' }]));
    localStorage.setItem(`a2a-context-${sessionKey}`, 'context-id');

    // Connect first
    await act(async () => {
      await result.current.connect(mockAgentCard);
    });

    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');

    // Clear messages
    act(() => {
      result.current.clearMessages();
    });

    // Verify localStorage was cleared
    expect(removeItemSpy).toHaveBeenCalledWith(`a2a-messages-example-com-${sessionKey}`);
    expect(removeItemSpy).toHaveBeenCalledWith(`a2a-context-example-com-${sessionKey}`);
    expect(result.current.messages).toHaveLength(0);

    removeItemSpy.mockRestore();
    localStorage.clear();
  });

  it('should handle streaming updates with state transitions', async () => {
    // Mock streaming response that transitions states
    mockStreamReturnValue = {
      async *[Symbol.asyncIterator]() {
        yield {
          id: 'task-stream',
          state: 'running',
          messages: [
            {
              role: 'assistant',
              content: [{ type: 'text', content: 'Processing...' }],
            },
          ],
          artifacts: [],
        };
        yield {
          id: 'task-stream',
          state: 'completed',
          messages: [
            {
              role: 'assistant',
              content: [{ type: 'text', content: 'Processing... Done!' }],
            },
          ],
          artifacts: [],
        };
      },
    };

    const { result } = renderHook(() => useA2A());

    await act(async () => {
      await result.current.connect(mockAgentCard);
      await result.current.sendMessage('Process this');
    });

    // Verify the message was updated and streaming state changed
    const assistantMessage = result.current.messages.find((m) => m.role === 'assistant');
    expect(assistantMessage?.content).toBe('Processing... Done!');
    expect(assistantMessage?.isStreaming).toBe(false);
  });

  it('should handle multiple artifacts correctly', async () => {
    // Mock stream with multiple artifacts
    mockStreamReturnValue = {
      async *[Symbol.asyncIterator]() {
        yield {
          id: 'task-artifacts',
          state: 'completed',
          messages: [
            {
              role: 'assistant',
              content: [{ type: 'text', content: 'Created multiple files' }],
            },
          ],
          artifacts: [
            {
              artifactId: 'file1.js',
              name: 'file1.js',
              parts: [{ kind: 'text', text: 'console.log("file1");' }],
            },
            {
              artifactId: 'file2.js',
              name: 'file2.js',
              parts: [{ kind: 'text', text: 'console.log("file2");' }],
            },
          ],
        };
      },
    };

    const { result } = renderHook(() => useA2A());

    await act(async () => {
      await result.current.connect(mockAgentCard);
      await result.current.sendMessage('Create files');
    });

    // Should have user message + assistant message + 2 artifact messages
    expect(result.current.messages).toHaveLength(4);

    const artifactMessage1 = result.current.messages[2];
    const artifactMessage2 = result.current.messages[3];
    expect(artifactMessage1.content).toContain('file1.js');
    expect(artifactMessage2.content).toContain('file2.js');
    expect(artifactMessage1.metadata?.artifacts).toHaveLength(1);
    expect(artifactMessage2.metadata?.artifacts).toHaveLength(1);
  });

  it('should persist context ID to localStorage', async () => {
    const sessionKey = 'test-context';
    const agentUrl = 'http://example.com/.well-known/agent-card.json';
    const { result } = renderHook(() =>
      useA2A({
        persistSession: true,
        sessionKey,
        agentUrl,
      })
    );

    localStorage.setItem(`a2a-context-example-com-${sessionKey}`, 'stored-context-id');

    // Mock stream response
    mockStreamReturnValue = {
      async *[Symbol.asyncIterator]() {
        yield {
          id: 'task-context',
          state: 'completed',
          messages: [
            {
              role: 'assistant',
              content: [{ type: 'text', content: 'Using context' }],
            },
          ],
          artifacts: [],
        };
      },
    };

    await act(async () => {
      await result.current.connect(mockAgentCard);
      await result.current.sendMessage('Test with context');
    });

    // Context should be persisted
    expect(localStorage.getItem(`a2a-context-example-com-${sessionKey}`)).toBeTruthy();

    localStorage.clear();
  });
});

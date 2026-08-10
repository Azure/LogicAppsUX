import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentCard } from '../../types';
import { useA2A } from '../use-a2a';

vi.mock('../../client/a2a-client', () => ({
  A2AClient: vi.fn(() => ({
    getCapabilities: vi.fn(() => ({ streaming: true })),
    message: {
      stream: vi.fn(async function* () {
        yield {
          id: 'live-task',
          state: 'running',
          messages: [
            {
              role: 'assistant',
              content: [{ type: 'text', content: 'Live response' }],
            },
          ],
          artifacts: [],
        };
      }),
    },
  })),
}));

describe('useA2A authoritative history', () => {
  const agentUrl = 'http://example.com/.well-known/agent-card.json';
  const agentCard: AgentCard = {
    name: 'Test Agent',
    description: 'Test agent',
    version: '1.0.0',
    url: agentUrl,
    serviceEndpoint: 'http://example.com/agent',
    capabilities: [],
  };

  beforeEach(() => {
    localStorage.clear();
  });

  it('should not let cached messages or context override parent history', async () => {
    const sessionKey = 'test-session';
    localStorage.setItem(
      `a2a-messages-example-com-${sessionKey}`,
      JSON.stringify([
        {
          id: 'message-1',
          role: 'user',
          content: 'Current',
          timestamp: '2024-01-01T10:00:00Z',
          metadata: { source: 'stale-cache' },
        },
      ])
    );
    localStorage.setItem(`a2a-context-example-com-${sessionKey}`, 'stale-context');
    const initialMessages = [
      {
        id: 'message-1',
        role: 'user' as const,
        content: 'Current',
        timestamp: new Date('2024-01-01T10:00:00Z'),
        metadata: { source: 'parent-history' },
      },
    ];
    const { result } = renderHook(() =>
      useA2A({
        persistSession: true,
        sessionKey,
        agentUrl,
        initialContextId: 'authoritative-context',
        initialMessages,
      })
    );

    await act(async () => {
      await result.current.connect(agentCard);
    });

    expect(result.current.messages).toEqual(initialMessages);
    expect(result.current.messages[0]?.timestamp).toBeInstanceOf(Date);
    expect(result.current.messages[0]?.metadata).toEqual({ source: 'parent-history' });
    expect(result.current.contextId).toBe('authoritative-context');
  });

  it('should treat empty parent history as authoritative', async () => {
    const sessionKey = 'empty-session';
    localStorage.setItem(
      `a2a-messages-example-com-${sessionKey}`,
      JSON.stringify([{ id: 'stale-message', role: 'assistant', content: 'Stale', timestamp: '2024-01-01T09:00:00Z' }])
    );
    const { result } = renderHook(() =>
      useA2A({
        persistSession: true,
        sessionKey,
        agentUrl,
        initialContextId: 'empty-context',
        initialMessages: [],
      })
    );

    await act(async () => {
      await result.current.connect(agentCard);
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.contextId).toBe('empty-context');
  });

  it('should replace stale cache when parent history arrives after connection', async () => {
    const sessionKey = 'late-history-session';
    localStorage.setItem(
      `a2a-messages-example-com-${sessionKey}`,
      JSON.stringify([{ id: 'stale-message', role: 'assistant', content: 'Stale', timestamp: '2024-01-01T09:00:00Z' }])
    );
    localStorage.setItem(`a2a-context-example-com-${sessionKey}`, 'stale-context');
    const initialMessages = [
      {
        id: 'message-1',
        role: 'user' as const,
        content: 'Current',
        timestamp: new Date('2024-01-01T10:00:00Z'),
      },
    ];
    const { result, rerender } = renderHook(
      ({ messages, contextId }) =>
        useA2A({
          persistSession: true,
          sessionKey,
          agentUrl,
          initialContextId: contextId,
          initialMessages: messages,
        }),
      { initialProps: { messages: undefined as typeof initialMessages | undefined, contextId: undefined as string | undefined } }
    );

    await act(async () => {
      await result.current.connect(agentCard);
    });
    expect(result.current.messages[0]?.id).toBe('stale-message');

    rerender({ messages: initialMessages, contextId: 'authoritative-context' });

    expect(result.current.messages).toEqual(initialMessages);
    expect(result.current.contextId).toBe('authoritative-context');
  });

  it('should clear stale cache when empty parent history arrives after connection', async () => {
    const sessionKey = 'late-empty-session';
    localStorage.setItem(
      `a2a-messages-example-com-${sessionKey}`,
      JSON.stringify([{ id: 'stale-message', role: 'assistant', content: 'Stale', timestamp: '2024-01-01T09:00:00Z' }])
    );
    const { result, rerender } = renderHook(
      ({ messages, contextId }) =>
        useA2A({
          persistSession: true,
          sessionKey,
          agentUrl,
          initialContextId: contextId,
          initialMessages: messages,
        }),
      { initialProps: { messages: undefined as [] | undefined, contextId: undefined as string | undefined } }
    );

    await act(async () => {
      await result.current.connect(agentCard);
    });
    expect(result.current.messages[0]?.id).toBe('stale-message');

    rerender({ messages: [], contextId: 'empty-context' });

    expect(result.current.messages).toEqual([]);
    expect(result.current.contextId).toBe('empty-context');
  });

  it('should preserve an active turn when parent history arrives late', async () => {
    const historicalMessages = [
      {
        id: 'history-message',
        role: 'assistant' as const,
        content: 'Earlier response',
        timestamp: new Date('2024-01-01T10:00:00Z'),
      },
    ];
    const { result, rerender } = renderHook(
      ({ messages }) =>
        useA2A({
          initialMessages: messages,
        }),
      { initialProps: { messages: undefined as typeof historicalMessages | undefined } }
    );

    await act(async () => {
      await result.current.connect(agentCard);
      await result.current.sendMessage('Live request');
    });
    expect(result.current.messages.some((message) => message.id === 'assistant-live-task-0')).toBe(true);

    rerender({ messages: historicalMessages });

    expect(result.current.messages[0]).toEqual(historicalMessages[0]);
    expect(result.current.messages.some((message) => message.role === 'user' && message.content === 'Live request')).toBe(true);
    expect(result.current.messages.some((message) => message.id === 'assistant-live-task-0')).toBe(true);
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { useChatStore, type ChatStore } from './chatStore';

describe('chatStore', () => {
  let store: ChatStore;

  beforeEach(() => {
    // Reset the store before each test
    store = useChatStore.getState();
    store.clearMessages();
    store.setConnected(false);
  });

  it('should initialize with default state', () => {
    expect(store.messages).toEqual([]);
    expect(store.isConnected).toBe(false);
  });

  it('should add a message', () => {
    const message = {
      id: 'msg-1',
      role: 'user' as const,
      content: 'Hello',
      timestamp: new Date(),
    };

    store.addMessage(message);

    const messages = useChatStore.getState().messages;
    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual(message);
  });

  it('should add multiple messages', () => {
    const message1 = {
      id: 'msg-1',
      role: 'user' as const,
      content: 'Hello',
      timestamp: new Date(),
    };

    const message2 = {
      id: 'msg-2',
      role: 'assistant' as const,
      content: 'Hi there!',
      timestamp: new Date(),
    };

    store.addMessage(message1);
    store.addMessage(message2);

    const messages = useChatStore.getState().messages;
    expect(messages).toHaveLength(2);
    expect(messages[0]).toEqual(message1);
    expect(messages[1]).toEqual(message2);
  });

  it('should update an existing message', () => {
    const message = {
      id: 'msg-1',
      role: 'assistant' as const,
      content: 'Loading...',
      timestamp: new Date(),
      isStreaming: true,
    };

    store.addMessage(message);

    // Update the message
    store.updateMessage('msg-1', {
      content: 'Hello! How can I help you?',
      isStreaming: false,
    });

    const messages = useChatStore.getState().messages;
    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe('Hello! How can I help you?');
    expect(messages[0].isStreaming).toBe(false);
    expect(messages[0].id).toBe('msg-1'); // ID should not change
  });

  it('should not update non-existent message', () => {
    const message = {
      id: 'msg-1',
      role: 'user' as const,
      content: 'Hello',
      timestamp: new Date(),
    };

    store.addMessage(message);

    // Try to update non-existent message
    store.updateMessage('msg-999', { content: 'Updated' });

    const messages = useChatStore.getState().messages;
    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe('Hello'); // Original message unchanged
  });

  it('should clear all messages', () => {
    store.addMessage({
      id: 'msg-1',
      role: 'user' as const,
      content: 'Hello',
      timestamp: new Date(),
    });

    store.addMessage({
      id: 'msg-2',
      role: 'assistant' as const,
      content: 'Hi!',
      timestamp: new Date(),
    });

    expect(useChatStore.getState().messages).toHaveLength(2);

    store.clearMessages();

    expect(useChatStore.getState().messages).toHaveLength(0);
  });

  it('should set connected state', () => {
    expect(store.isConnected).toBe(false);

    store.setConnected(true);
    expect(useChatStore.getState().isConnected).toBe(true);

    store.setConnected(false);
    expect(useChatStore.getState().isConnected).toBe(false);
  });

  it('should handle message with metadata', () => {
    const messageWithMetadata = {
      id: 'msg-1',
      role: 'assistant' as const,
      content: 'Here is your file',
      timestamp: new Date(),
      metadata: {
        isArtifact: true,
        fileName: 'test.js',
        rawContent: 'console.log("test");',
      },
    };

    store.addMessage(messageWithMetadata);

    const messages = useChatStore.getState().messages;
    expect(messages[0].metadata).toEqual({
      isArtifact: true,
      fileName: 'test.js',
      rawContent: 'console.log("test");',
    });
  });

  it('should handle message with attachments', () => {
    const messageWithAttachments = {
      id: 'msg-1',
      role: 'user' as const,
      content: 'Here are my files',
      timestamp: new Date(),
      attachments: [
        {
          id: 'att-1',
          name: 'document.pdf',
          size: 1024,
          type: 'application/pdf',
          status: 'completed' as const,
        },
      ],
    };

    store.addMessage(messageWithAttachments);

    const messages = useChatStore.getState().messages;
    expect(messages[0].attachments).toHaveLength(1);
    expect(messages[0].attachments?.[0].name).toBe('document.pdf');
  });

  it('should handle message with error status', () => {
    const errorMessage = {
      id: 'msg-1',
      role: 'user' as const,
      content: 'Test message',
      timestamp: new Date(),
      status: 'error' as const,
    };

    store.addMessage(errorMessage);

    const messages = useChatStore.getState().messages;
    expect(messages[0].status).toBe('error');
  });

  it('should preserve message order', () => {
    const messages = Array.from({ length: 5 }, (_, i) => ({
      id: `msg-${i}`,
      role: i % 2 === 0 ? 'user' : ('assistant' as const),
      content: `Message ${i}`,
      timestamp: new Date(Date.now() + i * 1000),
    }));

    messages.forEach((msg) => store.addMessage(msg));

    const storedMessages = useChatStore.getState().messages;
    expect(storedMessages).toHaveLength(5);
    storedMessages.forEach((msg, i) => {
      expect(msg.id).toBe(`msg-${i}`);
      expect(msg.content).toBe(`Message ${i}`);
    });
  });

  it('should handle partial message updates', () => {
    const message = {
      id: 'msg-1',
      role: 'assistant' as const,
      content: 'Original content',
      timestamp: new Date(),
      isStreaming: true,
      metadata: {
        taskId: 'task-1',
      },
    };

    store.addMessage(message);

    // Update only content
    store.updateMessage('msg-1', { content: 'Updated content' });

    let messages = useChatStore.getState().messages;
    expect(messages[0].content).toBe('Updated content');
    expect(messages[0].isStreaming).toBe(true); // Should remain unchanged
    expect(messages[0].metadata?.taskId).toBe('task-1'); // Should remain unchanged

    // Update only streaming state
    store.updateMessage('msg-1', { isStreaming: false });

    messages = useChatStore.getState().messages;
    expect(messages[0].content).toBe('Updated content');
    expect(messages[0].isStreaming).toBe(false);
  });

  it('should be able to access store state from multiple components', () => {
    // Simulate access from multiple components
    const state1 = useChatStore.getState();

    state1.addMessage({
      id: 'msg-1',
      role: 'user' as const,
      content: 'From component 1',
      timestamp: new Date(),
    });

    // Get fresh state after update
    const state2 = useChatStore.getState();

    // Both states should see the update
    expect(state2.messages).toHaveLength(1);
    expect(state2.messages[0].content).toBe('From component 1');
  });

  it('should handle rapid updates correctly', () => {
    const messageId = 'streaming-msg';

    store.addMessage({
      id: messageId,
      role: 'assistant' as const,
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    });

    // Simulate rapid streaming updates
    const updates = ['H', 'He', 'Hel', 'Hell', 'Hello', 'Hello!'];
    updates.forEach((content) => {
      store.updateMessage(messageId, { content });
    });

    store.updateMessage(messageId, { isStreaming: false });

    const messages = useChatStore.getState().messages;
    expect(messages[0].content).toBe('Hello!');
    expect(messages[0].isStreaming).toBe(false);
  });
});

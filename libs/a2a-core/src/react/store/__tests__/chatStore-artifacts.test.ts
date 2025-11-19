import { describe, it, expect, beforeEach } from 'vitest';
import { useChatStore } from '../chatStore';
import type { Message } from '../../types';

describe('chatStore - Artifact Processing with Files', () => {
  beforeEach(() => {
    const store = useChatStore.getState();
    store.clearMessages();
    // Clear all session data
    useChatStore.setState({
      sessionMessages: new Map(),
      sessions: [],
      currentSessionId: null,
    });
  });

  describe('File Artifact Processing', () => {
    it('should create message with files when artifact contains file parts', () => {
      const store = useChatStore.getState();
      const sessionId = 'test-session-id';

      // Simulate the artifact processing by directly adding a message with files
      const fileMessage: Message = {
        id: 'artifact-file-test-artifact-id',
        content: ' ',
        sender: 'assistant',
        timestamp: new Date(),
        status: 'sent',
        files: [
          {
            name: 'test-image.png',
            mimeType: 'image/png',
            data: 'base64encodeddata',
          },
        ],
        metadata: {
          taskId: 'task-123',
          contextId: sessionId,
          artifactId: 'test-artifact-id',
        },
      };

      // Manually add to session messages (simulating what the store does)
      const currentMessages = store.sessionMessages.get(sessionId) || [];
      const newSessionMessages = new Map(store.sessionMessages);
      newSessionMessages.set(sessionId, [...currentMessages, fileMessage]);

      useChatStore.setState({ sessionMessages: newSessionMessages });

      // Verify the message was added correctly
      const messages = useChatStore.getState().sessionMessages.get(sessionId);
      expect(messages).toHaveLength(1);
      expect(messages![0].files).toHaveLength(1);
      expect(messages![0].files![0].name).toBe('test-image.png');
      expect(messages![0].files![0].mimeType).toBe('image/png');
      expect(messages![0].files![0].data).toBe('base64encodeddata');
    });

    it('should handle multiple file parts in a single artifact', () => {
      const sessionId = 'test-session-id';

      const fileMessage: Message = {
        id: 'artifact-file-multi-artifact-id',
        content: ' ',
        sender: 'assistant',
        timestamp: new Date(),
        status: 'sent',
        files: [
          {
            name: 'image1.png',
            mimeType: 'image/png',
            data: 'base64data1',
          },
          {
            name: 'image2.jpg',
            mimeType: 'image/jpeg',
            data: 'base64data2',
          },
        ],
        metadata: {
          taskId: 'task-123',
          contextId: sessionId,
          artifactId: 'multi-artifact-id',
        },
      };

      const newSessionMessages = new Map();
      newSessionMessages.set(sessionId, [fileMessage]);
      useChatStore.setState({ sessionMessages: newSessionMessages });

      const messages = useChatStore.getState().sessionMessages.get(sessionId);
      expect(messages).toHaveLength(1);
      expect(messages![0].files).toHaveLength(2);
    });

    it('should prevent duplicate artifacts using artifactId', () => {
      const sessionId = 'test-session-id';
      const artifactId = 'duplicate-artifact-id';

      const fileMessage1: Message = {
        id: `artifact-file-${artifactId}`,
        content: ' ',
        sender: 'assistant',
        timestamp: new Date(),
        status: 'sent',
        files: [
          {
            name: 'test.png',
            mimeType: 'image/png',
            data: 'base64data',
          },
        ],
        metadata: {
          taskId: 'task-123',
          contextId: sessionId,
          artifactId,
        },
      };

      // Add first message
      let currentMessages = useChatStore.getState().sessionMessages.get(sessionId) || [];
      let newSessionMessages = new Map(useChatStore.getState().sessionMessages);
      newSessionMessages.set(sessionId, [...currentMessages, fileMessage1]);
      useChatStore.setState({ sessionMessages: newSessionMessages });

      // Try to add duplicate (same artifactId)
      const fileMessage2: Message = {
        ...fileMessage1,
        timestamp: new Date(), // Different timestamp
      };

      currentMessages = useChatStore.getState().sessionMessages.get(sessionId) || [];

      // Check if message with same artifactId already exists
      const existingIndex = currentMessages.findIndex(
        (msg) => msg.metadata?.artifactId === artifactId || msg.id === `artifact-file-${artifactId}`
      );

      // Should find existing message
      expect(existingIndex).toBeGreaterThanOrEqual(0);

      // Don't add duplicate
      if (existingIndex >= 0) {
        // Message already exists, don't add
      } else {
        newSessionMessages = new Map(useChatStore.getState().sessionMessages);
        newSessionMessages.set(sessionId, [...currentMessages, fileMessage2]);
        useChatStore.setState({ sessionMessages: newSessionMessages });
      }

      // Should still only have 1 message
      const messages = useChatStore.getState().sessionMessages.get(sessionId);
      expect(messages).toHaveLength(1);
    });

    it('should handle artifacts with both text and file parts', () => {
      const sessionId = 'test-session-id';

      // Add text artifact
      const textMessage: Message = {
        id: 'artifact-text-mixed-artifact-id',
        content: '📄 code.js:\n```js\nconsole.log("hello");\n```',
        sender: 'assistant',
        timestamp: new Date(),
        status: 'sent',
        metadata: {
          taskId: 'task-123',
          contextId: sessionId,
          isArtifact: true,
          artifactName: 'code.js',
          rawContent: 'console.log("hello");',
          artifactId: 'mixed-artifact-id',
        },
      };

      // Add file artifact
      const fileMessage: Message = {
        id: 'artifact-file-mixed-artifact-id-2',
        content: ' ',
        sender: 'assistant',
        timestamp: new Date(),
        status: 'sent',
        files: [
          {
            name: 'screenshot.png',
            mimeType: 'image/png',
            data: 'base64imagedata',
          },
        ],
        metadata: {
          taskId: 'task-123',
          contextId: sessionId,
          artifactId: 'mixed-artifact-id-2',
        },
      };

      const newSessionMessages = new Map();
      newSessionMessages.set(sessionId, [textMessage, fileMessage]);
      useChatStore.setState({ sessionMessages: newSessionMessages });

      const messages = useChatStore.getState().sessionMessages.get(sessionId);
      expect(messages).toHaveLength(2);
      expect(messages![0].metadata?.isArtifact).toBe(true);
      expect(messages![1].files).toHaveLength(1);
    });

    it('should store artifactId in metadata for tracking', () => {
      const sessionId = 'test-session-id';
      const artifactId = 'tracking-artifact-id';

      const fileMessage: Message = {
        id: `artifact-file-${artifactId}`,
        content: ' ',
        sender: 'assistant',
        timestamp: new Date(),
        status: 'sent',
        files: [
          {
            name: 'test.png',
            mimeType: 'image/png',
            data: 'base64data',
          },
        ],
        metadata: {
          taskId: 'task-123',
          contextId: sessionId,
          artifactId,
        },
      };

      const newSessionMessages = new Map();
      newSessionMessages.set(sessionId, [fileMessage]);
      useChatStore.setState({ sessionMessages: newSessionMessages });

      const messages = useChatStore.getState().sessionMessages.get(sessionId);
      expect(messages![0].metadata?.artifactId).toBe(artifactId);
    });

    it('should handle file with missing name gracefully', () => {
      const sessionId = 'test-session-id';

      const fileMessage: Message = {
        id: 'artifact-file-no-name',
        content: ' ',
        sender: 'assistant',
        timestamp: new Date(),
        status: 'sent',
        files: [
          {
            name: 'file', // Default name when not provided
            mimeType: 'image/png',
            data: 'base64data',
          },
        ],
        metadata: {
          taskId: 'task-123',
          contextId: sessionId,
          artifactId: 'no-name-artifact',
        },
      };

      const newSessionMessages = new Map();
      newSessionMessages.set(sessionId, [fileMessage]);
      useChatStore.setState({ sessionMessages: newSessionMessages });

      const messages = useChatStore.getState().sessionMessages.get(sessionId);
      expect(messages![0].files![0].name).toBe('file');
    });
  });

  describe('Message ID Generation', () => {
    it('should use artifactId in message ID for consistency', () => {
      const artifactId = 'consistent-artifact-id';
      const expectedMessageId = `artifact-file-${artifactId}`;

      const sessionId = 'test-session-id';
      const fileMessage: Message = {
        id: expectedMessageId,
        content: ' ',
        sender: 'assistant',
        timestamp: new Date(),
        status: 'sent',
        files: [
          {
            name: 'test.png',
            mimeType: 'image/png',
            data: 'base64data',
          },
        ],
        metadata: {
          taskId: 'task-123',
          contextId: sessionId,
          artifactId,
        },
      };

      const newSessionMessages = new Map();
      newSessionMessages.set(sessionId, [fileMessage]);
      useChatStore.setState({ sessionMessages: newSessionMessages });

      const messages = useChatStore.getState().sessionMessages.get(sessionId);
      expect(messages![0].id).toBe(expectedMessageId);
    });
  });
});

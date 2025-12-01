/**
 * Test data fixtures for A2A Chat E2E tests
 *
 * Provides factory functions for creating test messages and inputs
 */

import type { Message } from '@microsoft/a2achat-core';
import { createUserMessage, createAssistantMessage } from './mock-responses';

/**
 * Test message content samples
 */
export const TEST_MESSAGES = {
  // Basic messages
  SIMPLE_GREETING: 'Hello!',
  SIMPLE_QUESTION: 'How are you?',
  SIMPLE_RESPONSE: 'I am doing well, thank you for asking!',

  // Edge cases
  EMPTY: '',
  WHITESPACE_ONLY: '   ',
  SINGLE_CHAR: 'a',
  MAX_LENGTH: 'a'.repeat(10000),

  // Unicode and special characters
  EMOJI: 'Hello 👋 How are you? 😊',
  UNICODE: '你好世界 🌍 مرحبا بالعالم',
  SPECIAL_CHARS: '<script>alert("xss")</script>',
  NEWLINES: 'Line 1\nLine 2\nLine 3',
  MIXED_CONTENT: 'Text with **markdown** and `code` and [links](https://example.com)',

  // Long messages
  PARAGRAPH: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.`,
  MULTI_PARAGRAPH: `First paragraph with some text.\n\nSecond paragraph with more text.\n\nThird paragraph with even more text.`,

  // Code samples
  CODE_BLOCK: '```typescript\nconst hello = "world";\nconsole.log(hello);\n```',
  JSON_DATA: '{"key": "value", "nested": {"foo": "bar"}}',

  // Rapid-fire test messages
  RAPID_1: 'Message 1',
  RAPID_2: 'Message 2',
  RAPID_3: 'Message 3',
  RAPID_4: 'Message 4',
  RAPID_5: 'Message 5',
} as const;

/**
 * Test context IDs
 */
export const TEST_CONTEXTS = {
  DEFAULT: 'test-context-1',
  SECONDARY: 'test-context-2',
  SESSION_1: 'test-session-1',
  SESSION_2: 'test-session-2',
} as const;

/**
 * Test task IDs
 */
export const TEST_TASKS = {
  DEFAULT: 'test-task-1',
  SECONDARY: 'test-task-2',
  AUTH_REQUIRED: 'test-task-auth',
  ERROR: 'test-task-error',
} as const;

/**
 * Test auth consent URLs
 */
export const TEST_AUTH = {
  CONSENT_URL: 'https://consent.example.com/auth?state=test',
  CONSENT_URL_2: 'https://consent.example.com/auth2?state=test',
  INVALID_URL: 'not-a-url',
} as const;

/**
 * Test metadata
 */
export const TEST_METADATA = {
  DEFAULT: { source: 'test', timestamp: new Date().toISOString() },
  WITH_USER: { userId: 'test-user-123', source: 'test' },
  WITH_SESSION: { sessionId: 'test-session-123', source: 'test' },
} as const;

/**
 * Create a test user message with optional overrides
 */
export const createTestUserMessage = (
  content: string = TEST_MESSAGES.SIMPLE_QUESTION,
  metadata?: Record<string, unknown>
): Message => {
  return createUserMessage(content, metadata ?? TEST_METADATA.DEFAULT);
};

/**
 * Create a test assistant message with optional overrides
 */
export const createTestAssistantMessage = (
  content: string = TEST_MESSAGES.SIMPLE_RESPONSE,
  metadata?: Record<string, unknown>
): Message => {
  return createAssistantMessage(content, metadata ?? TEST_METADATA.DEFAULT);
};

/**
 * Create a conversation history for testing
 */
export const createTestConversation = (messageCount = 3): Message[] => {
  const messages: Message[] = [];

  for (let i = 0; i < messageCount; i++) {
    messages.push(
      createUserMessage(`User message ${i + 1}`, TEST_METADATA.DEFAULT),
      createAssistantMessage(`Assistant response ${i + 1}`, TEST_METADATA.DEFAULT)
    );
  }

  return messages;
};

/**
 * Test timing delays (in milliseconds)
 */
export const TEST_DELAYS = {
  NONE: 0,
  FAST: 50,
  NORMAL: 100,
  SLOW: 500,
  VERY_SLOW: 1000,
  TIMEOUT: 5000,
} as const;

/**
 * Test error scenarios
 */
export const TEST_ERRORS = {
  NETWORK: {
    code: -32000,
    message: 'Network error',
    data: { type: 'network', retryable: true },
  },
  SERVER: {
    code: -32603,
    message: 'Internal server error',
    data: { statusCode: 500, retryable: true },
  },
  VALIDATION: {
    code: -32602,
    message: 'Invalid input',
    data: { retryable: false },
  },
  RATE_LIMIT: {
    code: -32001,
    message: 'Rate limit exceeded',
    data: { retryable: true, retryAfter: 60 },
  },
  TIMEOUT: {
    code: -32002,
    message: 'Request timeout',
    data: { retryable: true },
  },
  UNAUTHORIZED: {
    code: -32003,
    message: 'Unauthorized',
    data: { retryable: false },
  },
} as const;

/**
 * Test viewport sizes
 */
export const TEST_VIEWPORTS = {
  MOBILE_SMALL: { width: 320, height: 568 }, // iPhone SE
  MOBILE_MEDIUM: { width: 375, height: 667 }, // iPhone 8
  MOBILE_LARGE: { width: 414, height: 896 }, // iPhone 11 Pro Max
  TABLET_PORTRAIT: { width: 768, height: 1024 }, // iPad
  TABLET_LANDSCAPE: { width: 1024, height: 768 }, // iPad landscape
  DESKTOP_SMALL: { width: 1280, height: 720 },
  DESKTOP_MEDIUM: { width: 1440, height: 900 },
  DESKTOP_LARGE: { width: 1920, height: 1080 },
} as const;

/**
 * Test user agents
 */
export const TEST_USER_AGENTS = {
  CHROME_DESKTOP:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  FIREFOX_DESKTOP:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
  SAFARI_DESKTOP:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  CHROME_MOBILE:
    'Mozilla/5.0 (Linux; Android 10; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  SAFARI_MOBILE:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
} as const;

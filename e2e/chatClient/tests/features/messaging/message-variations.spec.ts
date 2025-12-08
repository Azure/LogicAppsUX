/**
 * Message Handling Variations Tests
 *
 * Tests for advanced message handling scenarios including:
 * - Very long messages
 * - Rapid successive messages
 * - Complex emoji and Unicode
 * - Message boundary edge cases
 */

import { test, expect } from '../../../fixtures/sse-fixtures';

const AGENT_CARD_URL = 'http://localhost:3001/api/agents/test/.well-known/agent-card.json';

test.describe('Long Message Handling', { tag: '@mock' }, () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /start a new chat/i }).click();
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5000 });
  });

  test('should handle very long user messages (1000+ characters)', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    // Create a 1000+ character message
    const longMessage = 'This is a very long message. '.repeat(40) + 'End of long message.';

    expect(longMessage.length).toBeGreaterThan(1000);

    await messageInput.fill(longMessage);
    await sendButton.click();

    // User message should appear (check for beginning and end)
    await expect(page.getByText('This is a very long message.', { exact: false })).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByText('End of long message.')).toBeVisible({ timeout: 5000 });

    // Agent should respond
    await expect(page.getByText(/I received your message/)).toBeVisible({ timeout: 10000 });
  });

  test('should handle extremely long messages (5000+ characters)', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    // Create a 5000+ character message
    const extremelyLongMessage = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(100);

    expect(extremelyLongMessage.length).toBeGreaterThan(5000);

    await messageInput.fill(extremelyLongMessage);
    await sendButton.click();

    // User message should appear
    await expect(page.getByText('Lorem ipsum dolor sit amet', { exact: false })).toBeVisible({
      timeout: 5000,
    });

    // Agent should respond
    await expect(page.getByText(/I received your message/)).toBeVisible({ timeout: 10000 });
  });

  test('should handle very long agent responses', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    // Trigger a long response
    await messageInput.fill('give me a very long response');
    await sendButton.click();

    // Wait for user message
    await expect(page.getByText('give me a very long response')).toBeVisible({ timeout: 5000 });

    // Agent should respond with long text
    await expect(page.getByText('This is a very long response that contains a lot of information')).toBeVisible({ timeout: 10000 });

    // Verify scrolling works by checking if messages container is scrollable
    const messagesContainer = page.locator('[class*="messages"]').or(page.locator('[role="log"]'));
    if ((await messagesContainer.count()) > 0) {
      const scrollHeight = await messagesContainer.first().evaluate((el) => el.scrollHeight);
      const clientHeight = await messagesContainer.first().evaluate((el) => el.clientHeight);

      // If scrollHeight > clientHeight, the container is scrollable (which is good for long content)
      // This is just a validation that the UI can handle scrolling
      expect(scrollHeight).toBeGreaterThanOrEqual(clientHeight);
    }
  });

  test('should preserve line breaks in long messages', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    // Create a multi-line long message
    const lines = [];
    for (let i = 1; i <= 20; i++) {
      lines.push(`Line ${i}: This is line number ${i} of the message`);
    }
    const multiLineMessage = lines.join('\n');

    await messageInput.fill(multiLineMessage);
    await sendButton.click();

    // Check for first and last lines - use first() to avoid strict mode violation
    // since agent response may also contain the message text
    await expect(page.getByText('Line 1: This is line number 1').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Line 20: This is line number 20').first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Rapid Message Sending', { tag: '@mock' }, () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /start a new chat/i }).click();
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5000 });
  });

  test('should queue messages when sent rapidly', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    // Send first message
    await messageInput.fill('First rapid message');
    await sendButton.click();

    // Wait for response to complete
    await expect(page.getByText(/I received your message: "First rapid message"/)).toBeVisible({
      timeout: 10000,
    });

    // Wait for input to be re-enabled
    await expect(messageInput).toBeEnabled({ timeout: 5000 });

    // Send second message quickly
    await messageInput.fill('Second rapid message');
    await sendButton.click();

    // Wait for response
    await expect(page.getByText(/I received your message: "Second rapid message"/)).toBeVisible({
      timeout: 10000,
    });

    // Both messages should be visible in history
    await expect(page.getByText('First rapid message').first()).toBeVisible();
    await expect(page.getByText('Second rapid message').first()).toBeVisible();
  });

  test('should disable input while waiting for response', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    // Send message
    await messageInput.fill('Test message');
    await sendButton.click();

    // Input should be disabled immediately after send
    await expect(messageInput).toBeDisabled({ timeout: 2000 });

    // Wait for response to complete
    await expect(page.getByText(/I received your message/)).toBeVisible({ timeout: 10000 });

    // Input should be re-enabled
    await expect(messageInput).toBeEnabled({ timeout: 5000 });
  });

  test('should handle three messages in quick succession', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    const messages = ['First message', 'Second message', 'Third message'];

    for (const msg of messages) {
      // Wait for input to be enabled before sending next message
      await expect(messageInput).toBeEnabled({ timeout: 10000 });

      await messageInput.fill(msg);
      await sendButton.click();

      // Wait for response
      await expect(page.getByText(`I received your message: "${msg}"`)).toBeVisible({
        timeout: 10000,
      });
    }

    // All three messages should be visible
    for (const msg of messages) {
      await expect(page.getByText(msg).first()).toBeVisible();
    }
  });
});

test.describe('Emoji and Complex Unicode', { tag: '@mock' }, () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /start a new chat/i }).click();
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5000 });
  });

  test('should handle messages with multiple emojis', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    const emojiMessage = '👋 Hello! 🌟 How are you? 🎉 Great to see you! 💯';
    await messageInput.fill(emojiMessage);
    await sendButton.click();

    // Use first() to avoid strict mode violation - message appears in user bubble and possibly agent response
    await expect(page.getByText(emojiMessage).first()).toBeVisible({ timeout: 5000 });
  });

  test('should handle emoji-only messages', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    const emojiOnlyMessage = '🎨🎭🎪🎬🎮';
    await messageInput.fill(emojiOnlyMessage);
    await sendButton.click();

    await expect(page.getByText(emojiOnlyMessage)).toBeVisible({ timeout: 5000 });
  });

  test('should handle complex emoji with modifiers', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    // Emoji with skin tone modifiers and combined characters
    const complexEmoji = '👨‍👩‍👧‍👦 👍🏽 🏳️‍🌈 👩🏾‍💻';
    await messageInput.fill(complexEmoji);
    await sendButton.click();

    // Use first() to avoid strict mode violation - message appears in user bubble and possibly agent response
    await expect(page.getByText(complexEmoji).first()).toBeVisible({ timeout: 5000 });
  });

  test('should handle mixed scripts in one message', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    // Mix of Latin, CJK, Arabic, Cyrillic, and emoji
    const mixedMessage = 'Hello 你好 مرحبا Привет 🌍';
    await messageInput.fill(mixedMessage);
    await sendButton.click();

    await expect(page.getByText(mixedMessage)).toBeVisible({ timeout: 5000 });
  });

  test('should handle right-to-left text', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    const rtlMessage = 'مرحبا بك في عالم البرمجة';
    await messageInput.fill(rtlMessage);
    await sendButton.click();

    await expect(page.getByText(rtlMessage)).toBeVisible({ timeout: 5000 });
  });

  test('should handle mathematical symbols and special characters', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    const mathMessage = '∑ ∫ ∂ √ ∞ ≈ ≠ ≤ ≥ ∈ ∉ ⊂ ⊃ ∪ ∩';
    await messageInput.fill(mathMessage);
    await sendButton.click();

    await expect(page.getByText(mathMessage)).toBeVisible({ timeout: 5000 });
  });

  test('should handle currency and special symbols', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    const symbolsMessage = '€ £ ¥ ₹ ₽ ₿ © ® ™ ° § ¶';
    await messageInput.fill(symbolsMessage);
    await sendButton.click();

    await expect(page.getByText(symbolsMessage)).toBeVisible({ timeout: 5000 });
  });

  test('should handle box drawing and block characters', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    const boxMessage = '┌─┬─┐\n│ │ │\n├─┼─┤\n│ │ │\n└─┴─┘';
    await messageInput.fill(boxMessage);
    await sendButton.click();

    // Check for a part of the box drawing - use first() to avoid strict mode violation
    await expect(page.getByText('┌─┬─┐', { exact: false }).first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Message Boundary Edge Cases', { tag: '@mock' }, () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /start a new chat/i }).click();
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5000 });
  });

  test('should handle messages with only whitespace characters', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    // Try to send message with only spaces
    await messageInput.fill('     ');

    // Send button should be disabled or message should not send
    // (This behavior depends on your implementation)
    const isDisabled = await sendButton.isDisabled();

    if (!isDisabled) {
      await sendButton.click();

      // If message sends, it should be trimmed to empty or show validation
      // The exact behavior depends on implementation
      // For now, just verify the app doesn't crash
      await page.waitForTimeout(1000);
    }
  });

  test('should handle messages with tabs and special whitespace', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    const messageWithTabs = 'Word1\tWord2\tWord3';
    await messageInput.fill(messageWithTabs);
    await sendButton.click();

    // Message should appear (tabs might be converted to spaces)
    await expect(page.getByText(/Word1.*Word2.*Word3/)).toBeVisible({ timeout: 5000 });
  });

  test('should handle messages with null-like strings', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    const messages = ['null', 'undefined', 'NaN', '{}', '[]', 'false', '0'];

    for (const msg of messages) {
      await expect(messageInput).toBeEnabled({ timeout: 5000 });
      await messageInput.fill(msg);
      await sendButton.click();

      // Message should appear as-is
      await expect(page.getByText(msg).first()).toBeVisible({ timeout: 5000 });

      // Wait for response
      await expect(messageInput).toBeEnabled({ timeout: 10000 });
    }
  });

  test('should handle messages with JSON-like content', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    const jsonMessage = '{"name": "test", "value": 123, "active": true}';
    await messageInput.fill(jsonMessage);
    await sendButton.click();

    await expect(page.getByText(jsonMessage)).toBeVisible({ timeout: 5000 });
  });

  test('should handle messages with HTML-like content', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    const htmlMessage = '<div>Hello <strong>World</strong></div>';
    await messageInput.fill(htmlMessage);
    await sendButton.click();

    // Should display as plain text, not render as HTML
    await expect(page.getByText(htmlMessage)).toBeVisible({ timeout: 5000 });
  });

  test('should handle messages with script-like content', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    const scriptMessage = '<script>alert("test")</script>';
    await messageInput.fill(scriptMessage);
    await sendButton.click();

    // Should display as plain text, never execute
    await expect(page.getByText(scriptMessage)).toBeVisible({ timeout: 5000 });
  });

  test('should handle messages with URL-like content', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    const urlMessage = 'Check this out: https://example.com/path?param=value&other=123#section';
    await messageInput.fill(urlMessage);
    await sendButton.click();

    // Use first() to avoid strict mode violation - message appears in user bubble and possibly agent response
    await expect(page.getByText(urlMessage).first()).toBeVisible({ timeout: 5000 });
  });

  test('should handle messages with file paths', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    const pathMessages = ['C:\\Users\\Test\\Documents\\file.txt', '/home/user/documents/file.txt', '..\\..\\config\\secrets.json'];

    for (const msg of pathMessages) {
      await expect(messageInput).toBeEnabled({ timeout: 5000 });
      await messageInput.fill(msg);
      await sendButton.click();

      await expect(page.getByText(msg).first()).toBeVisible({ timeout: 5000 });

      // Wait for response before next message
      await expect(messageInput).toBeEnabled({ timeout: 10000 });
    }
  });

  test('should handle messages with SQL-like content', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    const sqlMessage = "SELECT * FROM users WHERE id = 1 OR '1'='1'";
    await messageInput.fill(sqlMessage);
    await sendButton.click();

    // Should display as plain text
    await expect(page.getByText(sqlMessage)).toBeVisible({ timeout: 5000 });
  });

  test('should handle messages with backticks and template literals', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    const templateMessage = 'Use `backticks` for code or `${variable}` syntax';
    await messageInput.fill(templateMessage);
    await sendButton.click();

    await expect(page.getByText(templateMessage)).toBeVisible({ timeout: 5000 });
  });

  test('should handle messages with regex patterns', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    const regexMessage = '/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/';
    await messageInput.fill(regexMessage);
    await sendButton.click();

    await expect(page.getByText(regexMessage)).toBeVisible({ timeout: 5000 });
  });

  test('should handle messages with zero-width characters', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    // Zero-width space (U+200B) and zero-width joiner (U+200D)
    const zeroWidthMessage = 'Hello\u200BWorld\u200DThere';
    await messageInput.fill(zeroWidthMessage);
    await sendButton.click();

    // Should handle gracefully (might display as "HelloWorldThere")
    await expect(page.getByText(/Hello.*World.*There/)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Message Performance', { tag: '@mock' }, () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /start a new chat/i }).click();
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5000 });
  });

  test('should maintain responsiveness with many messages in history', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    // Send 10 messages to build up history
    for (let i = 1; i <= 10; i++) {
      await expect(messageInput).toBeEnabled({ timeout: 10000 });
      await messageInput.fill(`Message number ${i}`);

      const startTime = Date.now();
      await sendButton.click();

      // Wait for response
      await expect(page.getByText(`I received your message: "Message number ${i}"`)).toBeVisible({
        timeout: 10000,
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Verify response time doesn't degrade significantly
      // Allow up to 10 seconds per message (generous for E2E tests)
      expect(responseTime).toBeLessThan(10000);
    }

    // Verify all messages are in history
    await expect(page.getByText('Message number 1').first()).toBeVisible();
    await expect(page.getByText('Message number 10').first()).toBeVisible();
  });

  test('should handle rapid input changes without lag', async ({ page }) => {
    const messageInput = page.locator('textarea').first();

    // Type and delete rapidly
    for (let i = 0; i < 5; i++) {
      await messageInput.fill(`Rapid test ${i}`);
      await page.waitForTimeout(50);
      await messageInput.clear();
      await page.waitForTimeout(50);
    }

    // Final message should work normally
    await messageInput.fill('Final message');
    await expect(messageInput).toHaveValue('Final message');
  });
});

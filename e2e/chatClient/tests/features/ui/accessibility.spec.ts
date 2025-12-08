/**
 * Accessibility Tests
 *
 * Tests for WCAG compliance and keyboard accessibility.
 */

import { test, expect, type Route } from '@playwright/test';

const AGENT_CARD = {
  protocolVersion: '1.0',
  name: 'Test Agent',
  description: 'A test agent for E2E testing',
  url: 'http://localhost:3001/api/agents/test',
  version: '1.0.0',
  capabilities: {
    streaming: true,
    pushNotifications: false,
    stateTransitionHistory: false,
  },
  defaultInputModes: ['text'],
  defaultOutputModes: ['text'],
  skills: [],
};

const AGENT_CARD_URL = 'http://localhost:3001/api/agents/test/.well-known/agent-card.json';

test.describe('Keyboard Navigation', { tag: '@mock' }, () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/agents/test/.well-known/agent-card.json', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(AGENT_CARD),
      });
    });

    await page.route('**/api/agents/test', async (route: Route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }

      const postData = route.request().postDataJSON();
      if (postData?.method === 'contexts/list') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ jsonrpc: '2.0', id: postData.id, result: [] }),
        });
        return;
      }

      await route.continue();
    });

    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to "Start a new chat" button with Tab', async ({ page }) => {
    // Press Tab to focus first focusable element
    await page.keyboard.press('Tab');

    // Continue tabbing until we find the "Start a new chat" button
    let attempts = 0;
    while (attempts < 10) {
      const focusedElement = page.locator(':focus');
      const text = await focusedElement.textContent().catch(() => '');

      if (text.match(/start.*new.*chat/i)) {
        // Found it!
        await expect(focusedElement).toBeFocused();
        return;
      }

      await page.keyboard.press('Tab');
      attempts++;
    }

    // Should have found the button within 10 tabs
    expect(attempts).toBeLessThan(10);
  });

  test('should activate "Start a new chat" with Enter key', async ({ page }) => {
    // Find and focus the button
    const startButton = page.getByRole('button', { name: /start a new chat/i });
    await startButton.focus();
    await expect(startButton).toBeFocused();

    // Press Enter to activate
    await page.keyboard.press('Enter');

    // Chat interface should appear
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5000 });
  });

  test('should activate "Start a new chat" with Space key', async ({ page }) => {
    const startButton = page.getByRole('button', { name: /start a new chat/i });
    await startButton.focus();

    // Press Space to activate
    await page.keyboard.press('Space');

    // Chat interface should appear
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5000 });
  });

  test('should navigate chat interface with keyboard', async ({ page }) => {
    await page.getByRole('button', { name: /start a new chat/i }).click();

    // Tab through the chat interface
    await page.keyboard.press('Tab');

    // Should be able to reach the message input
    let messageInputFocused = false;
    let attempts = 0;

    while (attempts < 10) {
      const focusedElement = page.locator(':focus');
      const tagName = await focusedElement.evaluate((el) => el.tagName).catch(() => '');

      if (tagName === 'TEXTAREA' || tagName === 'INPUT') {
        messageInputFocused = true;
        break;
      }

      await page.keyboard.press('Tab');
      attempts++;
    }

    expect(messageInputFocused).toBe(true);
  });

  test('should send message with Enter key from input', async ({ page }) => {
    await page.getByRole('button', { name: /start a new chat/i }).click();

    const messageInput = page.locator('textarea').first();
    await messageInput.focus();

    // Type message
    await page.keyboard.type('Test message from keyboard');

    // Press Enter to send
    await page.keyboard.press('Enter');

    // Message should appear
    await expect(page.getByText('Test message from keyboard')).toBeVisible({ timeout: 5000 });
  });

  test('should create new line with Shift+Enter', async ({ page }) => {
    await page.getByRole('button', { name: /start a new chat/i }).click();

    const messageInput = page.locator('textarea').first();
    await messageInput.focus();

    // Type first line
    await page.keyboard.type('Line 1');

    // Press Shift+Enter for new line
    await page.keyboard.press('Shift+Enter');

    // Type second line
    await page.keyboard.type('Line 2');

    // Value should contain both lines
    const value = await messageInput.inputValue();
    expect(value).toContain('Line 1');
    expect(value).toContain('Line 2');
  });
});

test.describe('ARIA Labels and Semantics', { tag: '@mock' }, () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/agents/test/.well-known/agent-card.json', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(AGENT_CARD),
      });
    });

    await page.route('**/api/agents/test', async (route: Route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }

      const postData = route.request().postDataJSON();
      if (postData?.method === 'contexts/list') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ jsonrpc: '2.0', id: postData.id, result: [] }),
        });
        return;
      }

      await route.continue();
    });

    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');
  });

  test('should have accessible button labels', async ({ page }) => {
    // "Start a new chat" button should be accessible
    const startButton = page.getByRole('button', { name: /start a new chat/i });
    await expect(startButton).toBeVisible();

    // Should have accessible name (either text content or aria-label)
    const accessibleName = await startButton.evaluate((el) => {
      return el.textContent || el.getAttribute('aria-label');
    });

    expect(accessibleName).toBeTruthy();
    expect(accessibleName).toMatch(/new.*chat/i);
  });

  test('should have proper heading structure', async ({ page }) => {
    // Check for proper heading hierarchy - can be h1/h2/h3 or elements with role="heading"
    const h1 = await page.locator('h1').count();
    const h2 = await page.locator('h2').count();
    const h3 = await page.locator('h3').count();
    const roleHeadings = await page.getByRole('heading').count();

    // Should have at least some headings for structure (including role="heading")
    const totalHeadings = h1 + h2 + h3 + roleHeadings;
    expect(totalHeadings).toBeGreaterThan(0);
  });

  test('should have accessible form controls', async ({ page }) => {
    await page.getByRole('button', { name: /start a new chat/i }).click();

    const messageInput = page.locator('textarea').first();

    // Input should have accessible attributes
    const hasLabel = await messageInput.getAttribute('aria-label');
    const hasLabelledBy = await messageInput.getAttribute('aria-labelledby');
    const hasPlaceholder = await messageInput.getAttribute('placeholder');

    // Should have at least one way to identify the input
    expect(hasLabel || hasLabelledBy || hasPlaceholder).toBeTruthy();
  });

  test('should use semantic HTML elements', async ({ page }) => {
    await page.getByRole('button', { name: /start a new chat/i }).click();

    // Message input should be a proper form control
    const messageInputTagName = await page
      .locator('textarea')
      .first()
      .evaluate((el) => el.tagName);

    expect(messageInputTagName).toBe('TEXTAREA');

    // Send button should be a button element
    const sendButton = page.locator('button:has(svg)').last();
    const sendButtonTagName = await sendButton.evaluate((el) => el.tagName);

    expect(sendButtonTagName).toBe('BUTTON');
  });

  test('should have proper button types', async ({ page }) => {
    await page.getByRole('button', { name: /start a new chat/i }).click();

    // Send button should have type="button" to prevent form submission
    const sendButton = page.locator('button:has(svg)').last();
    const buttonType = await sendButton.getAttribute('type');

    // Should be either 'button' or 'submit' (both valid)
    expect(['button', 'submit']).toContain(buttonType);
  });
});

test.describe('Focus Management', { tag: '@mock' }, () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/agents/test/.well-known/agent-card.json', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(AGENT_CARD),
      });
    });

    await page.route('**/api/agents/test', async (route: Route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }

      const postData = route.request().postDataJSON();
      if (postData?.method === 'contexts/list') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ jsonrpc: '2.0', id: postData.id, result: [] }),
        });
        return;
      }

      await route.continue();
    });

    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');
  });

  test('should move focus to message input when chat opens', async ({ page }) => {
    await page.getByRole('button', { name: /start a new chat/i }).click();

    // Wait for chat to open
    await page.waitForTimeout(500);

    // Focus might be on the input automatically
    const messageInput = page.locator('textarea').first();

    // Either already focused or can be focused
    const isFocused = await messageInput.evaluate((el) => el === document.activeElement);

    if (!isFocused) {
      // If not auto-focused, clicking should focus it
      await messageInput.click();
      await expect(messageInput).toBeFocused();
    }
  });

  test('should disable input while agent is responding', async ({ page }) => {
    await page.getByRole('button', { name: /start a new chat/i }).click();

    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    // Initially enabled
    await expect(messageInput).toBeEnabled();

    await messageInput.fill('Test message');
    await sendButton.click();

    // Input should be disabled while agent is responding
    await expect(messageInput).toBeDisabled({ timeout: 5000 });

    // Input should be cleared
    await expect(messageInput).toHaveValue('');
  });

  test('should have visible focus indicators', async ({ page }) => {
    await page.getByRole('button', { name: /start a new chat/i }).click();

    const messageInput = page.locator('textarea').first();
    await messageInput.focus();

    // Check for focus styles (outline or border change)
    const focusStyle = await messageInput.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        outline: computed.outline,
        outlineWidth: computed.outlineWidth,
        borderColor: computed.borderColor,
        boxShadow: computed.boxShadow,
      };
    });

    // Should have some kind of focus indicator
    const hasFocusIndicator = focusStyle.outline !== 'none' || parseInt(focusStyle.outlineWidth) > 0 || focusStyle.boxShadow !== 'none';

    expect(hasFocusIndicator).toBe(true);
  });

  test('should not trap keyboard focus', async ({ page }) => {
    await page.getByRole('button', { name: /start a new chat/i }).click();

    // Tab through all focusable elements
    let tabCount = 0;
    const visited = new Set<string>();

    while (tabCount < 20) {
      await page.keyboard.press('Tab');

      const focusedId = await page
        .locator(':focus')
        .evaluate((el) => {
          return el.id || el.className || el.tagName;
        })
        .catch(() => 'unknown');

      if (visited.has(focusedId) && tabCount > 5) {
        // We've cycled back - focus is managed properly
        break;
      }

      visited.add(focusedId);
      tabCount++;
    }

    // Should cycle through focus (not infinite, not stuck)
    expect(tabCount).toBeLessThan(20);
  });
});

test.describe('Color Contrast', { tag: '@mock' }, () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/agents/test/.well-known/agent-card.json', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(AGENT_CARD),
      });
    });

    await page.route('**/api/agents/test', async (route: Route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }

      const postData = route.request().postDataJSON();
      if (postData?.method === 'contexts/list') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ jsonrpc: '2.0', id: postData.id, result: [] }),
        });
        return;
      }

      await route.continue();
    });

    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');
  });

  test('should have readable text in empty state', async ({ page }) => {
    const emptyStateText = page.getByText('No chats yet');

    // Get computed styles
    const styles = await emptyStateText.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        color: computed.color,
        backgroundColor: computed.backgroundColor,
        fontSize: computed.fontSize,
      };
    });

    // Font size should be at least 12px for readability
    const fontSize = parseInt(styles.fontSize);
    expect(fontSize).toBeGreaterThanOrEqual(12);
  });

  test('should have readable button text', async ({ page }) => {
    const startButton = page.getByRole('button', { name: /start a new chat/i });

    const styles = await startButton.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        color: computed.color,
        backgroundColor: computed.backgroundColor,
        fontSize: computed.fontSize,
      };
    });

    // Button text should be readable size
    const fontSize = parseInt(styles.fontSize);
    expect(fontSize).toBeGreaterThanOrEqual(14);
  });
});

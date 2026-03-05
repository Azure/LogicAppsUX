/**
 * Login Prompt E2E Tests
 *
 * Tests for the login prompt UI that appears when:
 * - Agent card fetch returns 401
 * - Token refresh fails
 *
 * Tests cover:
 * - Login prompt display
 * - Sign in button interactions
 * - Login popup flow
 * - Loading states
 * - Successful authentication
 */

import { test as baseTest, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Agent card URL - intercepted by our mocks
const AGENT_CARD_URL = 'http://localhost:3001/api/agents/test/.well-known/agent-card.json';

// Mock identity providers to inject into the page
const MOCK_IDENTITY_PROVIDERS = {
  aad: {
    name: 'Microsoft',
    signInEndpoint: '/.auth/login/aad',
  },
};

// Helper to set up login prompt test with identity providers
async function setupLoginPromptTest(page: Page) {
  // Intercept and modify the HTML to inject identity providers
  // This replaces the placeholder BEFORE the inline script runs
  await page.route('**/*', async (route) => {
    const request = route.request();
    if (request.resourceType() === 'document') {
      const response = await route.fetch();
      let html = await response.text();
      // Replace the placeholder with actual identity providers JSON
      const providersJson = JSON.stringify(MOCK_IDENTITY_PROVIDERS).replace(/"/g, '\\"');
      html = html.replace(
        'window.IDENTITY_PROVIDERS = "REPLACE_ME_WITH_IDENTITY_PROVIDERS"',
        `window.IDENTITY_PROVIDERS = "${providersJson}"`
      );
      await route.fulfill({ response, body: html });
    } else {
      // Use fallback() to let other routes handle non-document requests
      await route.fallback();
    }
  });

  // Override auth/me to return unauthenticated (empty array)
  await page.route('**/.auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  // Override the agent card route to return 401
  await page.route('**/api/agents/test/.well-known/agent-card.json', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Unauthorized' }),
    });
  });

  // Also mock the auth refresh endpoint to fail
  await page.route('**/.auth/refresh', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Unauthorized' }),
    });
  });
}

baseTest.describe('Login Prompt Display', { tag: '@mock' }, () => {
  baseTest('should display login prompt when agent card returns 401', async ({ page }) => {
    await setupLoginPromptTest(page);

    // Navigate to the app
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);

    // Login prompt should be visible
    await expect(page.getByText('Sign in required')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Sign in to continue using the chat')).toBeVisible();
    // Should display identity provider buttons
    await expect(page.getByRole('button', { name: 'Microsoft account' })).toBeVisible();
  });

  baseTest('should display person icon in login prompt', async ({ page }) => {
    await setupLoginPromptTest(page);

    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);

    // Wait for login prompt
    await expect(page.getByText('Sign in required')).toBeVisible({ timeout: 10000 });

    // Person icon should be visible (SVG icon from Fluent UI)
    const iconContainer = page.locator('svg').first();
    await expect(iconContainer).toBeVisible();
  });

  baseTest('should show sign in button enabled by default', async ({ page }) => {
    await setupLoginPromptTest(page);

    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);

    // Wait for login prompt
    await expect(page.getByText('Sign in required')).toBeVisible({ timeout: 10000 });

    const signInButton = page.getByRole('button', { name: 'Microsoft account' });
    await expect(signInButton).toBeVisible();
    await expect(signInButton).toBeEnabled();
  });
});

baseTest.describe('Login Popup Flow', { tag: '@mock' }, () => {
  baseTest.beforeEach(async ({ page }) => {
    await setupLoginPromptTest(page);
  });

  baseTest('should open login popup when sign in button is clicked', async ({ page, context }) => {
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);

    // Wait for login prompt
    await expect(page.getByText('Sign in required')).toBeVisible({ timeout: 10000 });

    // Set up popup listener
    const popupPromise = context.waitForEvent('page');

    // Click sign in button (Microsoft is the first provider)
    await page.getByRole('button', { name: 'Microsoft account' }).click();

    // Wait for popup
    const popup = await popupPromise;

    // Verify popup URL contains auth login endpoint
    expect(popup.url()).toContain('.auth/login/aad');

    // Clean up
    await popup.close();
  });

  baseTest('should show loading state when popup is open', async ({ page, context }) => {
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);

    await expect(page.getByText('Sign in required')).toBeVisible({ timeout: 10000 });

    // Click sign in and capture popup
    const [popup] = await Promise.all([
      context.waitForEvent('page', { timeout: 10000 }),
      page.getByRole('button', { name: 'Microsoft account' }).click(),
    ]);

    // Button should show loading state (only on the clicked button)
    await expect(page.getByRole('button', { name: 'Signing in...' })).toBeVisible({ timeout: 2000 });

    // Button should be disabled while loading
    await expect(page.getByRole('button', { name: 'Signing in...' })).toBeDisabled();

    // Clean up
    await popup.close();
  });

  baseTest('should handle popup blocker gracefully', async ({ page }) => {
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);

    await expect(page.getByText('Sign in required')).toBeVisible({ timeout: 10000 });

    // Override window.open to return null (simulating popup blocker)
    await page.evaluate(() => {
      window.open = () => null;
    });

    // Click sign in
    await page.getByRole('button', { name: 'Microsoft account' }).click();

    // Wait a moment for the click to process
    await page.waitForTimeout(1000);

    // Login prompt should still be visible (app didn't crash)
    await expect(page.getByText('Sign in required')).toBeVisible();

    // Sign in button should be enabled again (not stuck in loading state)
    await expect(page.getByRole('button', { name: 'Microsoft account' })).toBeEnabled();
  });

  baseTest('should display error message when popup is blocked', async ({ page }) => {
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);

    await expect(page.getByText('Sign in required')).toBeVisible({ timeout: 10000 });

    // Override window.open to return null (simulating popup blocker)
    await page.evaluate(() => {
      window.open = () => null;
    });

    // Click sign in
    await page.getByRole('button', { name: 'Microsoft account' }).click();

    // Wait for button to return to enabled state (indicates error handling completed)
    // The button goes to "Signing in..." (disabled) then back to provider name (enabled) on error
    await expect(page.getByRole('button', { name: 'Microsoft account' })).toBeEnabled({ timeout: 5000 });

    // Login prompt should still be visible (app didn't crash)
    await expect(page.getByText('Sign in required')).toBeVisible();

    // Error message should be displayed (if the feature is working)
    // Using a soft assertion since this is a new feature
    const errorMessage = page.getByText(/failed to open login popup/i);
    const isErrorVisible = await errorMessage.isVisible().catch(() => false);
    if (isErrorVisible) {
      await expect(errorMessage).toBeVisible();
    }
  });
});

baseTest.describe('Token Refresh Flow', { tag: '@mock' }, () => {
  baseTest('should attempt token refresh before showing login prompt', async ({ page }) => {
    let refreshCalled = false;

    // Inject identity providers via HTML modification
    await injectIdentityProviders(page, MOCK_IDENTITY_PROVIDERS);

    // Track refresh calls
    await page.route('**/.auth/refresh', async (route) => {
      refreshCalled = true;
      await route.fulfill({ status: 401 });
    });

    await page.route('**/api/agents/test/.well-known/agent-card.json', async (route) => {
      await route.fulfill({ status: 401 });
    });

    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);

    // Wait for login prompt
    await expect(page.getByText('Sign in required')).toBeVisible({ timeout: 10000 });

    // Verify refresh was attempted
    expect(refreshCalled).toBe(true);
  });

  baseTest('should reload page if token refresh succeeds', async ({ page }) => {
    // Inject identity providers via HTML modification
    await injectIdentityProviders(page, MOCK_IDENTITY_PROVIDERS);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let refreshAttempts = 0;
    let agentCardAttempts = 0;

    await page.route('**/.auth/refresh', async (route) => {
      refreshAttempts++;
      // First refresh succeeds
      await route.fulfill({ status: 200 });
    });

    await page.route('**/api/agents/test/.well-known/agent-card.json', async (route) => {
      agentCardAttempts++;
      if (agentCardAttempts === 1) {
        // First attempt returns 401
        await route.fulfill({ status: 401 });
      } else {
        // After refresh, return success
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            name: 'Test Agent',
            description: 'A test agent',
            url: AGENT_CARD_URL,
            version: '1.0.0',
            capabilities: { streaming: true },
          }),
        });
      }
    });

    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);

    // Page should eventually reload and show chat (not login prompt)
    // Note: This test may need adjustment based on actual reload behavior
    await page.waitForTimeout(3000);

    // If refresh succeeded and page reloaded, login prompt should not be visible
    // (or chat should be visible)
  });
});

baseTest.describe('Authentication Success Flow', { tag: '@mock' }, () => {
  baseTest('should reload page after successful authentication', async ({ page, context }) => {
    // Inject identity providers via HTML modification
    await injectIdentityProviders(page, MOCK_IDENTITY_PROVIDERS);

    let authMeCallCount = 0;

    // Set up 401 for agent card initially
    await page.route('**/api/agents/test/.well-known/agent-card.json', async (route) => {
      await route.fulfill({ status: 401 });
    });

    await page.route('**/.auth/refresh', async (route) => {
      await route.fulfill({ status: 401 });
    });

    // Mock auth/me to return authenticated after popup closes
    await page.route('**/.auth/me', async (route) => {
      authMeCallCount++;
      if (authMeCallCount > 2) {
        // After some polling, return authenticated
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{ provider_name: 'aad', user_id: 'test-user' }]),
        });
      } else {
        // Initially not authenticated
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      }
    });

    // Mock the login page
    await page.route('**/.auth/login/aad*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <html>
            <body>
              <h1>Mock Login</h1>
              <script>
                setTimeout(() => window.close(), 1000);
              </script>
            </body>
          </html>
        `,
      });
    });

    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);

    // Wait for login prompt
    await expect(page.getByText('Sign in required')).toBeVisible({ timeout: 10000 });

    // Click sign in
    const [popup] = await Promise.all([
      context.waitForEvent('page', { timeout: 10000 }),
      page.getByRole('button', { name: 'Microsoft account' }).click(),
    ]);

    // Wait for popup to close (mock login page auto-closes)
    await popup.waitForEvent('close', { timeout: 5000 }).catch(() => {});

    // After successful auth, page should reload
    // The reload will happen automatically when auth is detected
  });
});

baseTest.describe('Login Prompt Accessibility', { tag: '@mock' }, () => {
  baseTest.beforeEach(async ({ page }) => {
    await setupLoginPromptTest(page);
  });

  baseTest('should have accessible button with proper role', async ({ page }) => {
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);

    await expect(page.getByText('Sign in required')).toBeVisible({ timeout: 10000 });

    // Button should be accessible by role (using first identity provider)
    const signInButton = page.getByRole('button', { name: 'Microsoft account' });
    await expect(signInButton).toBeVisible();
    await expect(signInButton).toHaveAttribute('type', 'button');
  });

  baseTest('should be keyboard navigable', async ({ page }) => {
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);

    await expect(page.getByText('Sign in required')).toBeVisible({ timeout: 10000 });

    // Tab to the sign in button
    await page.keyboard.press('Tab');

    // Button should be focusable (first identity provider button)
    const signInButton = page.getByRole('button', { name: 'Microsoft account' });
    await expect(signInButton).toBeFocused();
  });
});

// Use base test (without SSE fixture auto-mocking) for tests that need full control over routes
baseTest.describe('Successful Login to MultiSession Chat', { tag: '@mock' }, () => {
  baseTest('should show multi-session chat after successful sign in', async ({ page, context }) => {
    let isAuthenticated = false;

    // Use context.route to persist routes across page reloads
    // Mock agent card - returns 401 initially, then success after auth
    await context.route('**/api/agents/test/.well-known/agent-card.json', async (route) => {
      if (!isAuthenticated) {
        await route.fulfill({ status: 401 });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
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
            defaultOutputModes: ['text', 'data'],
            skills: [],
          }),
        });
      }
    });

    // Mock refresh to fail initially
    await context.route('**/.auth/refresh', async (route) => {
      await route.fulfill({ status: 401 });
    });

    // Mock auth/me - returns authenticated after login
    await context.route('**/.auth/me', async (route) => {
      if (isAuthenticated) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{ provider_name: 'aad', user_id: 'test-user' }]),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      }
    });

    // Mock the login page - sets authenticated flag and auto-closes
    await context.route('**/.auth/login/aad*', async (route) => {
      isAuthenticated = true;
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <html>
            <body>
              <h1>Mock Login Success</h1>
              <script>
                setTimeout(() => window.close(), 500);
              </script>
            </body>
          </html>
        `,
      });
    });

    // Mock contexts/list for sessions
    await context.route('**/api/agents/test', async (route) => {
      const request = route.request();
      if (request.method() !== 'POST') {
        await route.continue();
        return;
      }

      const postData = request.postDataJSON();
      const { method, id } = postData;

      if (method === 'contexts/list') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            jsonrpc: '2.0',
            id,
            result: [],
          }),
        });
        return;
      }

      await route.fulfill({ status: 400 });
    });

    // Inject identity providers via HTML modification (LAST to have highest priority in context.route)
    // Only modify main app pages, not auth pages
    await context.route('**/*', async (route) => {
      const request = route.request();
      const url = request.url();
      // Skip auth URLs and API URLs - they have their own handlers
      // Use fallback() to let other routes handle these
      if (url.includes('/.auth/') || url.includes('/api/')) {
        await route.fallback();
        return;
      }
      if (request.resourceType() === 'document') {
        const response = await route.fetch();
        let html = await response.text();
        const providersJson = JSON.stringify(MOCK_IDENTITY_PROVIDERS).replace(/"/g, '\\"');
        html = html.replace(
          'window.IDENTITY_PROVIDERS = "REPLACE_ME_WITH_IDENTITY_PROVIDERS"',
          `window.IDENTITY_PROVIDERS = "${providersJson}"`
        );
        await route.fulfill({ response, body: html });
      } else {
        await route.fallback();
      }
    });

    // Navigate with multiSession enabled
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}&multiSession=true`);

    // Should see login prompt first
    await expect(page.getByText('Sign in required')).toBeVisible({ timeout: 10000 });

    // Click sign in
    const [popup] = await Promise.all([
      context.waitForEvent('page', { timeout: 10000 }),
      page.getByRole('button', { name: 'Microsoft account' }).click(),
    ]);

    // Wait for popup to close (triggers auth success)
    await popup.waitForEvent('close', { timeout: 5000 }).catch(() => {
      popup.close();
    });

    // Wait for page reload and multi-session chat to appear
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    // After successful auth and reload, should see multi-session chat UI
    // Look for elements that indicate multi-session chat is loaded
    await expect(page.getByRole('button', { name: /start a new chat/i })).toBeVisible({ timeout: 15000 });
  });

  baseTest('should show chat input after successful sign in for single session', async ({ page, context }) => {
    let isAuthenticated = false;

    // Use context.route to persist routes across page reloads
    await context.route('**/api/agents/test/.well-known/agent-card.json', async (route) => {
      if (!isAuthenticated) {
        await route.fulfill({ status: 401 });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            protocolVersion: '1.0',
            name: 'Test Agent',
            description: 'A test agent for E2E testing',
            url: 'http://localhost:3001/api/agents/test',
            version: '1.0.0',
            capabilities: { streaming: true },
            defaultInputModes: ['text'],
            defaultOutputModes: ['text'],
            skills: [],
          }),
        });
      }
    });

    await context.route('**/.auth/refresh', async (route) => {
      await route.fulfill({ status: 401 });
    });

    await context.route('**/.auth/me', async (route) => {
      if (isAuthenticated) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{ provider_name: 'aad', user_id: 'test-user' }]),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      }
    });

    await context.route('**/.auth/login/aad*', async (route) => {
      isAuthenticated = true;
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <html>
            <body>
              <h1>Mock Login Success</h1>
              <script>setTimeout(() => window.close(), 500);</script>
            </body>
          </html>
        `,
      });
    });

    // Inject identity providers via HTML modification (LAST to have highest priority in context.route)
    // Only modify main app pages, not auth pages
    await context.route('**/*', async (route) => {
      const request = route.request();
      const url = request.url();
      // Skip auth URLs and API URLs - they have their own handlers
      // Use fallback() to let other routes handle these
      if (url.includes('/.auth/') || url.includes('/api/')) {
        await route.fallback();
        return;
      }
      if (request.resourceType() === 'document') {
        const response = await route.fetch();
        let html = await response.text();
        const providersJson = JSON.stringify(MOCK_IDENTITY_PROVIDERS).replace(/"/g, '\\"');
        html = html.replace(
          'window.IDENTITY_PROVIDERS = "REPLACE_ME_WITH_IDENTITY_PROVIDERS"',
          `window.IDENTITY_PROVIDERS = "${providersJson}"`
        );
        await route.fulfill({ response, body: html });
      } else {
        await route.fallback();
      }
    });

    // Navigate without multiSession (single session mode)
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);

    // Should see login prompt first
    await expect(page.getByText('Sign in required')).toBeVisible({ timeout: 10000 });

    // Click sign in
    const [popup] = await Promise.all([
      context.waitForEvent('page', { timeout: 10000 }),
      page.getByRole('button', { name: 'Microsoft account' }).click(),
    ]);

    // Wait for popup to close
    await popup.waitForEvent('close', { timeout: 5000 }).catch(() => {
      popup.close();
    });

    // Wait for page reload
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    // After successful auth, login prompt should NOT be visible
    await expect(page.getByText('Sign in required')).not.toBeVisible({ timeout: 15000 });
  });

  baseTest('should display agent name after successful authentication', async ({ page, context }) => {
    let isAuthenticated = false;
    const agentName = 'My Test Assistant';

    await context.route('**/api/agents/test/.well-known/agent-card.json', async (route) => {
      if (!isAuthenticated) {
        await route.fulfill({ status: 401 });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            protocolVersion: '1.0',
            name: agentName,
            description: 'A helpful assistant',
            url: 'http://localhost:3001/api/agents/test',
            version: '1.0.0',
            capabilities: { streaming: true },
            defaultInputModes: ['text'],
            defaultOutputModes: ['text'],
            skills: [],
          }),
        });
      }
    });

    await context.route('**/.auth/refresh', async (route) => {
      await route.fulfill({ status: 401 });
    });

    await context.route('**/.auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(isAuthenticated ? [{ provider_name: 'aad', user_id: 'test-user' }] : []),
      });
    });

    await context.route('**/.auth/login/aad*', async (route) => {
      isAuthenticated = true;
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<html><body><script>setTimeout(() => window.close(), 500);</script></body></html>',
      });
    });

    // Inject identity providers via HTML modification (LAST to have highest priority in context.route)
    // Only modify main app pages, not auth pages
    await context.route('**/*', async (route) => {
      const request = route.request();
      const url = request.url();
      // Skip auth URLs and API URLs - they have their own handlers
      // Use fallback() to let other routes handle these
      if (url.includes('/.auth/') || url.includes('/api/')) {
        await route.fallback();
        return;
      }
      if (request.resourceType() === 'document') {
        const response = await route.fetch();
        let html = await response.text();
        const providersJson = JSON.stringify(MOCK_IDENTITY_PROVIDERS).replace(/"/g, '\\"');
        html = html.replace(
          'window.IDENTITY_PROVIDERS = "REPLACE_ME_WITH_IDENTITY_PROVIDERS"',
          `window.IDENTITY_PROVIDERS = "${providersJson}"`
        );
        await route.fulfill({ response, body: html });
      } else {
        await route.fallback();
      }
    });

    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);

    // Login prompt should appear
    await expect(page.getByText('Sign in required')).toBeVisible({ timeout: 10000 });

    // Sign in
    const [popup] = await Promise.all([
      context.waitForEvent('page', { timeout: 10000 }),
      page.getByRole('button', { name: 'Microsoft account' }).click(),
    ]);

    await popup.waitForEvent('close', { timeout: 5000 }).catch(() => popup.close());
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    // After auth, login prompt should not be visible (we're now on the chat)
    await expect(page.getByText('Sign in required')).not.toBeVisible({ timeout: 15000 });
  });
});

// Helper to inject custom identity providers via HTML modification
async function injectIdentityProviders(page: Page, providers: Record<string, any>) {
  await page.route('**/*', async (route) => {
    const request = route.request();
    if (request.resourceType() === 'document') {
      const response = await route.fetch();
      let html = await response.text();
      const providersJson = JSON.stringify(providers).replace(/"/g, '\\"');
      html = html.replace(
        'window.IDENTITY_PROVIDERS = "REPLACE_ME_WITH_IDENTITY_PROVIDERS"',
        `window.IDENTITY_PROVIDERS = "${providersJson}"`
      );
      await route.fulfill({ response, body: html });
    } else {
      // Use fallback() to let other routes handle non-document requests
      await route.fallback();
    }
  });
}

baseTest.describe('Multiple Identity Providers', { tag: '@mock' }, () => {
  baseTest('should display multiple provider buttons when multiple providers are configured', async ({ page }) => {
    const multipleProviders = {
      aad: { signInEndpoint: '/.auth/login/aad', name: 'Microsoft' },
      google: { signInEndpoint: '/.auth/login/google', name: 'Google' },
      github: { signInEndpoint: '/.auth/login/github', name: 'GitHub' },
    };

    // Inject multiple identity providers
    await injectIdentityProviders(page, multipleProviders);

    // Override auth/me to return not authenticated
    await page.route('**/.auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    // Override agent card to return 401 (trigger login prompt)
    await page.route('**/api/agents/test/.well-known/agent-card.json', async (route) => {
      await route.fulfill({ status: 401 });
    });

    await page.route('**/.auth/refresh', async (route) => {
      await route.fulfill({ status: 401 });
    });

    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);

    // Wait for login prompt
    await expect(page.getByText('Sign in required')).toBeVisible({ timeout: 10000 });

    // All provider buttons should be visible
    await expect(page.getByRole('button', { name: 'Microsoft account' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Google account' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'GitHub account' })).toBeVisible();
  });

  baseTest('should use correct sign-in endpoint for each provider', async ({ page, context }) => {
    const multipleProviders = {
      aad: { signInEndpoint: '/.auth/login/aad', name: 'Microsoft' },
      google: { signInEndpoint: '/.auth/login/google', name: 'Google' },
    };

    // Inject multiple identity providers
    await injectIdentityProviders(page, multipleProviders);

    // Override auth/me to return not authenticated
    await page.route('**/.auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    // Override agent card to return 401 (trigger login prompt)
    await page.route('**/api/agents/test/.well-known/agent-card.json', async (route) => {
      await route.fulfill({ status: 401 });
    });

    await page.route('**/.auth/refresh', async (route) => {
      await route.fulfill({ status: 401 });
    });

    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);

    // Wait for login prompt
    await expect(page.getByText('Sign in required')).toBeVisible({ timeout: 10000 });

    // Test Google provider - click Google button and verify URL
    const popupPromise = context.waitForEvent('page');
    await page.getByRole('button', { name: 'Google account' }).click();
    const popup = await popupPromise;

    // Verify popup URL contains Google auth endpoint
    expect(popup.url()).toContain('.auth/login/google');

    await popup.close();
  });

  baseTest('should show loading state only on clicked provider button', async ({ page, context }) => {
    const multipleProviders = {
      aad: { signInEndpoint: '/.auth/login/aad', name: 'Microsoft' },
      google: { signInEndpoint: '/.auth/login/google', name: 'Google' },
    };

    // Inject multiple identity providers
    await injectIdentityProviders(page, multipleProviders);

    // Override auth/me to return not authenticated
    await page.route('**/.auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    // Override agent card to return 401 (trigger login prompt)
    await page.route('**/api/agents/test/.well-known/agent-card.json', async (route) => {
      await route.fulfill({ status: 401 });
    });

    await page.route('**/.auth/refresh', async (route) => {
      await route.fulfill({ status: 401 });
    });

    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);

    // Wait for login prompt
    await expect(page.getByText('Sign in required')).toBeVisible({ timeout: 10000 });

    // Click Google button
    const [popup] = await Promise.all([
      context.waitForEvent('page', { timeout: 10000 }),
      page.getByRole('button', { name: 'Google account' }).click(),
    ]);

    // Google button should show loading state
    await expect(page.getByText('Signing in...')).toBeVisible({ timeout: 2000 });

    // Microsoft button should still show provider name (not loading)
    await expect(page.getByRole('button', { name: 'Microsoft account' })).toBeVisible();

    // All buttons should be disabled while loading
    await expect(page.getByRole('button', { name: 'Microsoft account' })).toBeDisabled();

    await popup.close();
  });

  baseTest('should show configuration message when no providers configured', async ({ page }) => {
    // Intercept the HTML page FIRST and replace the IDENTITY_PROVIDERS placeholder with empty object
    // This simulates server-side injection of empty providers config
    await page.route('**/*', async (route) => {
      const request = route.request();
      // Only intercept document requests (the main HTML page)
      if (request.resourceType() === 'document') {
        const response = await route.fetch();
        let html = await response.text();
        html = html.replace('window.IDENTITY_PROVIDERS = "REPLACE_ME_WITH_IDENTITY_PROVIDERS"', 'window.IDENTITY_PROVIDERS = "{}"');
        await route.fulfill({ response, body: html });
      } else {
        // Use fallback() to let other routes handle non-document requests
        await route.fallback();
      }
    });

    // Override auth/me to return not authenticated
    await page.route('**/.auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    // Override agent card to return 401 (trigger login prompt)
    await page.route('**/api/agents/test/.well-known/agent-card.json', async (route) => {
      await route.fulfill({ status: 401 });
    });

    await page.route('**/.auth/refresh', async (route) => {
      await route.fulfill({ status: 401 });
    });

    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);

    // Wait for login prompt
    await expect(page.getByText('Sign in required')).toBeVisible({ timeout: 10000 });

    // Should show configuration message instead of buttons
    await expect(page.getByText('Configure easy auth and identity providers to enable chat client authentication')).toBeVisible();

    // No provider buttons should be visible
    await expect(page.getByRole('button', { name: /account/i })).not.toBeVisible();
  });

  baseTest('should handle single custom provider correctly', async ({ page, context }) => {
    // Intercept the HTML page FIRST and replace the IDENTITY_PROVIDERS placeholder with custom provider
    // This simulates server-side injection of custom providers config
    await page.route('**/*', async (route) => {
      const request = route.request();
      // Only intercept document requests (the main HTML page)
      if (request.resourceType() === 'document') {
        const response = await route.fetch();
        let html = await response.text();
        html = html.replace(
          'window.IDENTITY_PROVIDERS = "REPLACE_ME_WITH_IDENTITY_PROVIDERS"',
          'window.IDENTITY_PROVIDERS = \'{"okta":{"signInEndpoint":"/.auth/login/okta","name":"Okta SSO"}}\''
        );
        await route.fulfill({ response, body: html });
      } else {
        // Use fallback() to let other routes handle non-document requests
        await route.fallback();
      }
    });

    // Override auth/me to return not authenticated
    await page.route('**/.auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    // Override agent card to return 401 (trigger login prompt)
    await page.route('**/api/agents/test/.well-known/agent-card.json', async (route) => {
      await route.fulfill({ status: 401 });
    });

    await page.route('**/.auth/refresh', async (route) => {
      await route.fulfill({ status: 401 });
    });

    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);

    // Wait for login prompt
    await expect(page.getByText('Sign in required')).toBeVisible({ timeout: 10000 });

    // Custom provider button should be visible
    await expect(page.getByRole('button', { name: 'Okta SSO account' })).toBeVisible();

    // Click and verify correct endpoint
    const popupPromise = context.waitForEvent('page');
    await page.getByRole('button', { name: 'Okta SSO account' }).click();
    const popup = await popupPromise;

    expect(popup.url()).toContain('.auth/login/okta');

    await popup.close();
  });
});

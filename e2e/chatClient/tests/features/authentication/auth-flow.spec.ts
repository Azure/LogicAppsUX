/**
 * Authentication E2E Tests
 *
 * Tests for OBO (On-Behalf-Of) authentication flows including:
 * - Auth-required event handling
 * - Popup window interactions
 * - Single and multiple auth requirements
 * - Auth cancellation
 * - Auth completion and retry flows
 */

import { test, expect } from '../../../fixtures/sse-fixtures';

// Agent card URL - intercepted by our fixture
const AGENT_CARD_URL = 'http://localhost:3001/api/agents/test/.well-known/agent-card.json';

test.describe('Authentication Flows', { tag: '@mock' }, () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app with mock agent card (fixture will intercept requests)
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');

    // Start new chat
    await page.getByRole('button', { name: /start a new chat/i }).click();
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5000 });
  });

  test('should display authentication required UI', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    // Trigger auth required response
    await messageInput.fill('require auth');
    await sendButton.click();

    // Wait for user message
    await expect(page.getByText('require auth')).toBeVisible({ timeout: 5000 });

    // Auth message should appear
    await expect(page.getByText(/Authentication Required/i)).toBeVisible({ timeout: 10000 });

    // Service name should be visible (use exact match to avoid strict mode violation)
    await expect(page.getByText('Microsoft Graph', { exact: true })).toBeVisible({ timeout: 5000 });

    // Description should be visible
    await expect(page.getByText(/Access to your Microsoft Graph data is required/i)).toBeVisible({
      timeout: 5000,
    });

    // Sign in button should be visible
    await expect(page.getByRole('button', { name: /Sign In/i })).toBeVisible({ timeout: 5000 });
  });

  test('should display service icon when provided', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    await messageInput.fill('require auth');
    await sendButton.click();

    // Wait for auth UI
    await expect(page.getByText(/Authentication Required/i)).toBeVisible({ timeout: 10000 });

    // Check for service icon image
    const serviceIcon = page.locator('img[alt="Microsoft Graph"]');
    await expect(serviceIcon).toBeVisible({ timeout: 5000 });
    await expect(serviceIcon).toHaveAttribute('src', 'https://example.com/icons/graph.png');
  });

  test('should handle multiple authentication requirements', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    // Trigger multiple auth response
    await messageInput.fill('multiple auth');
    await sendButton.click();

    // Wait for auth UI
    await expect(page.getByText(/Authentication Required/i)).toBeVisible({ timeout: 10000 });

    // Both services should be listed (use exact match to avoid strict mode violation)
    await expect(page.getByText('Microsoft Graph', { exact: true })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('SharePoint', { exact: true })).toBeVisible({ timeout: 5000 });

    // Both descriptions should be visible
    await expect(page.getByText(/Access to your Microsoft Graph data is required/i)).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByText(/Access to your SharePoint sites is required/i)).toBeVisible({
      timeout: 5000,
    });

    // Both should have sign in buttons
    const signInButtons = page.getByRole('button', { name: /Sign In/i });
    await expect(signInButtons).toHaveCount(2);
  });

  test('should open popup when sign in button is clicked', async ({ page, context }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    await messageInput.fill('require auth');
    await sendButton.click();

    // Wait for auth UI
    await expect(page.getByText(/Authentication Required/i)).toBeVisible({ timeout: 10000 });

    // Set up popup listener before clicking
    const popupPromise = context.waitForEvent('page');

    // Click sign in button
    const signInButton = await page.getByRole('button', { name: 'Sign In' });
    await signInButton.click();

    // Wait for popup to open
    const popup = await popupPromise;

    // Verify popup URL points to mock consent page
    expect(popup.url()).toContain('/mock-consent');

    // Close popup to clean up
    await popup.close();
  });

  test('should show authenticating state when popup is open', async ({ page, context }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    await messageInput.fill('require auth');
    await sendButton.click();

    await expect(page.getByText(/Authentication Required/i)).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);
    const signInButton = page.getByRole('button', { name: /Sign In/i });

    // CRITICAL: Use Promise.all to ensure popup event is captured synchronously with the click
    const [popup] = await Promise.all([
      context.waitForEvent('page', { timeout: 5000 }),
      signInButton.click(),
    ]);

    // The button should transition to "Authenticating..." state while popup is open
    const authenticatingButton = page.getByRole('button', { name: /Authenticating/i });
    await expect(authenticatingButton).toBeVisible({ timeout: 2000 });

    // Clean up - close the popup
    await popup.close();
  });

  test('should handle cancel authentication', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    await messageInput.fill('require auth');
    await sendButton.click();

    await expect(page.getByText(/Authentication Required/i)).toBeVisible({ timeout: 10000 });

    // Find and click cancel button
    const cancelButton = page.getByRole('button', { name: /Cancel Authentication/i });
    await expect(cancelButton).toBeVisible({ timeout: 5000 });
    await cancelButton.click();

    // Should show canceled state
    await expect(page.getByText(/Authentication Canceled/i)).toBeVisible({ timeout: 5000 });
  });

  test('should disable cancel button while authenticating', async ({ page, context }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    await messageInput.fill('require auth');
    await sendButton.click();

    await expect(page.getByText(/Authentication Required/i)).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);

    // Cancel button should be enabled before auth starts
    const cancelButton = page.getByRole('button', { name: /Cancel Authentication/i });
    await expect(cancelButton).toBeEnabled({ timeout: 2000 });

    const signInButton = page.getByRole('button', { name: /Sign In/i });

    // CRITICAL: Use Promise.all to ensure popup event is captured synchronously with the click
    const [popup] = await Promise.all([
      context.waitForEvent('page', { timeout: 5000 }),
      signInButton.click(),
    ]);

    // While popup is open (during authentication), cancel button should be disabled
    await expect(cancelButton).toBeDisabled({ timeout: 2000 });

    // Clean up - close the popup
    await popup.close();
  });

  test('should handle popup blocker scenario', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    await messageInput.fill('require auth');
    await sendButton.click();

    await expect(page.getByText(/Authentication Required/i)).toBeVisible({ timeout: 10000 });

    // Override window.open to return null (simulating popup blocker)
    await page.evaluate(() => {
      window.open = () => null;
    });

    const signInButton = page.getByRole('button', { name: /Sign In/i });
    await signInButton.click();

    // Should show error state (implementation-dependent, may show alert or error message)
    // This tests that the app doesn't crash when popup is blocked
    await page.waitForTimeout(1000);

    // Auth UI should still be visible (not crashed)
    await expect(page.getByText(/Authentication Required/i)).toBeVisible();
  });
});

test.describe('Authentication Completion Flow', { tag: '@mock' }, () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /start a new chat/i }).click();
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5000 });
  });

  test('should show completed state after successful auth', async ({ page, context }) => {
    await context.setDefaultTimeout(30000);
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    await messageInput.fill('require auth');
    await sendButton.click();

    await page.waitForTimeout(500);
    await expect(page.getByText(/Authentication Required/i)).toBeVisible({ timeout: 10000 });
    const popupPromise = context.waitForEvent('page');
    const signInButton = page.getByRole('button', { name: /Sign In/i });
    await signInButton.click();
    const popup = await popupPromise;
    await popup.close();
    // Wait for authentication to complete (mocked popup closes automatically)
    const authenticatedButton = page.getByText('Authenticated', { exact: true });
    await expect(authenticatedButton).toBeVisible({ timeout: 8000 });

    // Should show completion badge
    await expect(page.getByText(/All services authenticated successfully/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test('should send authentication completed message', async ({ page, context }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    // First, trigger auth required
    await messageInput.fill('require auth');
    await sendButton.click();

    await expect(page.getByText(/Authentication Required/i)).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);

    // Open popup and wait for it to close (which triggers auth completion)
    const [popup] = await Promise.all([
      context.waitForEvent('page', { timeout: 5000 }),
      page.getByRole('button', { name: /Sign In/i }).click(),
    ]);

    // Wait for popup to close (mock consent page closes automatically)
    await popup.close();

    // Wait for authenticated state
    const authenticatedButton = page.getByText('Authenticated', { exact: true });
    await expect(authenticatedButton).toBeVisible({ timeout: 5000 });

    // The system should automatically resume the task after authentication
    // and return the secured data WITHOUT requiring manual user input
    await expect(
      page.getByText(/Authentication successful! Here is your secured data/i)
    ).toBeVisible({
      timeout: 10000,
    });
  });

  test('should handle multiple auth completions in sequence', async ({ page, context }) => {
    // TODO: This test depends on automatic auth completion messaging (see test above).
    // Once that feature is implemented, this test should verify that multiple
    // authentication requirements are handled correctly in sequence.

    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    await messageInput.fill('multiple auth');
    await sendButton.click();

    await expect(page.getByText(/Authentication Required/i)).toBeVisible({ timeout: 10000 });

    await page.waitForTimeout(500);
    // Authenticate first service

    let popUpPromise = context.waitForEvent('page');
    let signInButtons = page.getByRole('button', { name: /Sign In/i });

    // First auth (mocked popup closes automatically)
    await signInButtons.first().click();
    let popup = await popUpPromise;
    popup.close();

    await expect(page.getByRole('button', { name: 'Authenticated' })).toBeDisabled();
    signInButtons = page.getByRole('button', { name: /Sign In/i });
    popUpPromise = context.waitForEvent('page');
    // Second auth (mocked popup closes automatically)
    await signInButtons.first().click();
    popup = await popUpPromise;
    popup.close();
    // Both should show authenticated and completion message
    await expect(page.getByText(/All services authenticated successfully/i)).toBeVisible({
      timeout: 5000,
    });
  });
});

test.describe('Authentication Edge Cases', { tag: '@mock' }, () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /start a new chat/i }).click();
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5000 });
  });

  test('should maintain auth state after page interactions', async ({ page, context }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    await messageInput.fill('require auth');
    await sendButton.click();

    await expect(page.getByText(/Authentication Required/i)).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);
    const popupPromise = context.waitForEvent('page');
    const signInButton = page.getByRole('button', { name: /Sign In/i });
    await signInButton.click();

    const popup = await popupPromise;
    popup.close();
    // Wait for authenticated state (mocked popup closes automatically)
    const authenticatedButton = page.getByText('Authenticated', { exact: true });
    await expect(authenticatedButton).toBeVisible({ timeout: 5000 });

    // Scroll the page (simulate user interaction)
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(500);

    // Auth state should persist
    await expect(authenticatedButton).toBeVisible();
    await expect(page.getByText(/All services authenticated successfully/i)).toBeVisible();
  });
});

/**
 * Session Rename and Archive E2E Tests
 *
 * Tests for session management operations:
 * - Renaming sessions via double-click and edit button
 * - Archiving sessions (soft delete)
 * - Validation and error handling
 * - Integration with streaming messages
 */

import { test, expect } from '../../../fixtures/sse-fixtures';
import type { Route } from '@playwright/test';

const AGENT_CARD_URL = 'http://localhost:3001/api/agents/test/.well-known/agent-card.json';

test.describe('Session Rename Functionality', { tag: '@mock' }, () => {
  test.beforeEach(async ({ page }) => {
    // Track session names - make the mock stateful
    const sessionNames = new Map<string, string>([['session-1', 'Original Session Name']]);

    // Additional mock API endpoints (SSE fixtures handle agent card and basic mocking)
    await page.route('**/api/agents/test', async (route: Route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }

      const postData = route.request().postDataJSON();

      // Mock contexts/list - return one existing session with current name
      if (postData?.method === 'contexts/list') {
        const sessions = Array.from(sessionNames.entries()).map(([id, name]) => ({
          id,
          name,
          isArchived: false,
          createdAt: '01/10/2025 10:00:00 AM',
          updatedAt: '01/10/2025 10:30:00 AM',
          status: 'Running',
        }));

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: postData.id,
            result: sessions,
          }),
        });
        return;
      }

      // Mock context/update for rename (SINGULAR, not plural!)
      if (postData?.method === 'context/update') {
        const contextId = postData.params?.Id;
        const newName = postData.params?.Name;
        const isArchived = postData.params?.IsArchived;

        // Update the session name in our stateful map
        if (newName) {
          sessionNames.set(contextId, newName);
        }

        console.log('[SSE FIXTURE] context/update:', { contextId, newName, isArchived });

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: postData.id,
            result: {
              id: contextId,
              name: sessionNames.get(contextId) || 'Original Session Name',
              isArchived: isArchived !== undefined ? isArchived : false,
              status: 'Running',
            },
          }),
        });
        return;
      }

      // Mock message/stream
      if (postData?.method === 'message/stream') {
        const taskId = `task-${Date.now()}`;
        const contextId = postData.params?.message?.contextId || `ctx-${Date.now()}`;
        const userMessage = postData.params?.message?.parts?.[0]?.text || '';

        const sseEvents = [
          `data: ${JSON.stringify({
            jsonrpc: '2.0',
            id: postData.id,
            result: {
              taskId,
              contextId,
              state: 'completed',
              message: {
                role: 'assistant',
                parts: [{ kind: 'text', text: `Response to: ${userMessage}` }],
              },
            },
          })}\n\n`,
        ];

        await route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: sseEvents.join(''),
        });
        return;
      }

      await route.continue();
    });

    // Navigate with multi-session mode
    await page.goto(
      `http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}&multiSession=true`
    );
    await page.waitForLoadState('networkidle');
  });

  test('should rename session via sidebar double-click', async ({ page }) => {
    // Wait for session to appear in sidebar
    await expect(page.getByText('Original Session Name').first()).toBeVisible({ timeout: 5000 });

    // Double-click on session name in sidebar (has specific aria-label)
    const sidebarSessionName = page.getByLabel('Click edit icon or double-click to rename');
    await expect(sidebarSessionName).toBeVisible({ timeout: 2000 });
    await sidebarSessionName.dblclick();

    // Input should appear - use a more stable locator
    const input = page.locator('input[type="text"]').first();
    await expect(input).toBeVisible({ timeout: 2000 });
    await expect(input).toBeFocused();

    // Set up request listener to verify API call
    const renameRequestPromise = page.waitForRequest((request) => {
      if (!request.url().includes('/api/agents/test')) return false;
      if (request.method() !== 'POST') return false;

      try {
        const postData = request.postDataJSON();
        return (
          postData?.method === 'context/update' &&
          postData?.params?.Id === 'session-1' &&
          postData?.params?.Name === 'Renamed via Sidebar Double-Click'
        );
      } catch {
        return false;
      }
    });

    // Clear and type new name
    await input.clear();
    await input.fill('Renamed via Sidebar Double-Click');

    // Press Enter to save
    await input.press('Enter');

    // Verify the API request was made with correct parameters
    const renameRequest = await renameRequestPromise;
    const requestData = renameRequest.postDataJSON();
    expect(requestData.method).toBe('context/update');
    expect(requestData.params.Id).toBe('session-1');
    expect(requestData.params.Name).toBe('Renamed via Sidebar Double-Click');

    // Verify renamed text appears in both sidebar and chat header
    await expect(sidebarSessionName).toHaveText('Renamed via Sidebar Double-Click', {
      timeout: 5000,
    });

    // Chat header has aria-label "Click to edit or click the edit icon"
    const headerName = page.getByLabel('Click to edit or click the edit icon');
    await expect(headerName).toHaveText('Renamed via Sidebar Double-Click', { timeout: 5000 });

    // Old name should not be visible anywhere
    await expect(page.getByText('Original Session Name').first()).not.toBeVisible();
  });

  test('should rename session via header double-click', async ({ page }) => {
    // Wait for session to appear
    await expect(page.getByText('Original Session Name').first()).toBeVisible({ timeout: 5000 });

    // Double-click on session name in header (has different aria-label)
    const headerSessionName = page.getByLabel('Click to edit or click the edit icon');
    await expect(headerSessionName).toBeVisible({ timeout: 2000 });
    await headerSessionName.dblclick();

    // Input should appear in header
    const input = page.locator('input[type="text"]').first();
    await expect(input).toBeVisible({ timeout: 2000 });
    await expect(input).toBeFocused();

    // Set up request listener to verify API call
    const renameRequestPromise = page.waitForRequest((request) => {
      if (!request.url().includes('/api/agents/test')) return false;
      if (request.method() !== 'POST') return false;

      try {
        const postData = request.postDataJSON();
        return (
          postData?.method === 'context/update' &&
          postData?.params?.Id === 'session-1' &&
          postData?.params?.Name === 'Renamed via Header Double-Click'
        );
      } catch {
        return false;
      }
    });

    // Clear and type new name
    await input.clear();
    await input.fill('Renamed via Header Double-Click');

    // Press Enter to save
    await input.press('Enter');

    // Verify the API request was made with correct parameters
    const renameRequest = await renameRequestPromise;
    const requestData = renameRequest.postDataJSON();
    expect(requestData.method).toBe('context/update');
    expect(requestData.params.Id).toBe('session-1');
    expect(requestData.params.Name).toBe('Renamed via Header Double-Click');

    // Verify renamed text appears in both header and sidebar
    await expect(headerSessionName).toHaveText('Renamed via Header Double-Click', {
      timeout: 5000,
    });

    // Sidebar has aria-label "Click edit icon or double-click to rename"
    const sidebarName = page.getByLabel('Click edit icon or double-click to rename');
    await expect(sidebarName).toHaveText('Renamed via Header Double-Click', { timeout: 5000 });

    // Old name should not be visible anywhere
    await expect(page.getByText('Original Session Name').first()).not.toBeVisible();
  });

  test('should rename session via sidebar edit button', async ({ page }) => {
    // Wait for session to appear
    await expect(page.getByText('Original Session Name').first()).toBeVisible({ timeout: 5000 });

    // Hover over session to reveal edit button
    await page.getByText('Original Session Name').first().hover();

    // Click sidebar edit button (within the session list item)
    // Use the "Rename" title to target the sidebar button specifically
    const sidebarEditButton = page.locator('button[title="Rename"]').first();
    await expect(sidebarEditButton).toBeVisible({ timeout: 2000 });
    await sidebarEditButton.click();

    // Input should appear
    const input = page.locator('input[type="text"]').first();
    await expect(input).toBeVisible({ timeout: 2000 });

    // Set up request listener to verify API call
    const renameRequestPromise = page.waitForRequest((request) => {
      if (!request.url().includes('/api/agents/test')) return false;
      if (request.method() !== 'POST') return false;

      try {
        const postData = request.postDataJSON();
        return (
          postData?.method === 'context/update' &&
          postData?.params?.Id === 'session-1' &&
          postData?.params?.Name === 'Renamed via Sidebar Button'
        );
      } catch {
        return false;
      }
    });

    // Type new name
    await input.clear();
    await input.fill('Renamed via Sidebar Button');
    await input.press('Enter');

    // Verify the API request was made with correct parameters
    const renameRequest = await renameRequestPromise;
    const requestData = renameRequest.postDataJSON();
    expect(requestData.method).toBe('context/update');
    expect(requestData.params.Id).toBe('session-1');
    expect(requestData.params.Name).toBe('Renamed via Sidebar Button');

    // Verify new name appears in both sidebar and header
    const sidebarName = page.getByLabel('Click edit icon or double-click to rename');
    await expect(sidebarName).toHaveText('Renamed via Sidebar Button', { timeout: 5000 });

    const headerName = page.getByLabel('Click to edit or click the edit icon');
    await expect(headerName).toHaveText('Renamed via Sidebar Button', { timeout: 5000 });
  });

  test('should rename session via header edit button', async ({ page }) => {
    // Wait for session to appear
    await expect(page.getByText('Original Session Name').first()).toBeVisible({ timeout: 5000 });

    // Click header edit button (in the chat header area)
    // The header button has title="Rename chat" and is in the main header
    const headerEditButton = page.locator('button[title="Rename chat"]');
    await expect(headerEditButton).toBeVisible({ timeout: 2000 });
    await headerEditButton.click();

    // Input should appear in header
    const input = page.locator('input[type="text"]').first();
    await expect(input).toBeVisible({ timeout: 2000 });

    // Set up request listener to verify API call
    const renameRequestPromise = page.waitForRequest((request) => {
      if (!request.url().includes('/api/agents/test')) return false;
      if (request.method() !== 'POST') return false;

      try {
        const postData = request.postDataJSON();
        return (
          postData?.method === 'context/update' &&
          postData?.params?.Id === 'session-1' &&
          postData?.params?.Name === 'Renamed via Header Button'
        );
      } catch {
        return false;
      }
    });

    // Type new name
    await input.clear();
    await input.fill('Renamed via Header Button');
    await input.press('Enter');

    // Verify the API request was made with correct parameters
    const renameRequest = await renameRequestPromise;
    const requestData = renameRequest.postDataJSON();
    expect(requestData.method).toBe('context/update');
    expect(requestData.params.Id).toBe('session-1');
    expect(requestData.params.Name).toBe('Renamed via Header Button');

    // Verify new name appears in both sidebar and header
    const sidebarName = page.getByLabel('Click edit icon or double-click to rename');
    await expect(sidebarName).toHaveText('Renamed via Header Button', { timeout: 5000 });

    const headerName = page.getByLabel('Click to edit or click the edit icon');
    await expect(headerName).toHaveText('Renamed via Header Button', { timeout: 5000 });
  });

  test('should save rename with Enter key', async ({ page }) => {
    await expect(page.getByText('Original Session Name').first()).toBeVisible({ timeout: 5000 });

    // Start editing
    await page.getByText('Original Session Name').first().dblclick();
    const input = page.locator('input[type="text"]').first();

    // Rename and press Enter
    await input.clear();
    await input.fill('Saved with Enter');
    await input.press('Enter');

    await expect(page.getByText('Saved with Enter').first()).toBeVisible({ timeout: 5000 });
  });

  test('should cancel rename with Escape key', async ({ page }) => {
    await expect(page.getByText('Original Session Name').first()).toBeVisible({ timeout: 5000 });

    // Start editing
    await page.getByText('Original Session Name').first().dblclick();
    const input = page.locator('input[type="text"]').first();

    // Type new name but press Escape
    await input.clear();
    await input.fill('This Should Be Cancelled');
    await input.press('Escape');

    // Original name should still be there
    await expect(page.getByText('Original Session Name').first()).toBeVisible({ timeout: 2000 });
    await expect(page.getByText('This Should Be Cancelled').first()).not.toBeVisible();
  });

  test('should cancel rename on blur when clicking outside', async ({ page }) => {
    await expect(page.getByText('Original Session Name').first()).toBeVisible({ timeout: 5000 });

    // Start editing
    await page.getByText('Original Session Name').first().dblclick();
    const input = page.locator('input[type="text"]').first();

    // Type new name
    await input.clear();
    await input.fill('New Name');

    // Click outside (blur) - should save (not cancel based on SessionList.tsx line 396: onBlur={onSaveEdit})
    await page.locator('body').click({ position: { x: 10, y: 10 } });

    // Should be saved because onBlur triggers save
    await expect(page.getByText('New Name').first()).toBeVisible({ timeout: 5000 });
  });

  test('should trim whitespace from session names', async ({ page }) => {
    await expect(page.getByText('Original Session Name').first()).toBeVisible({ timeout: 5000 });

    await page.getByText('Original Session Name').first().dblclick();
    const input = page.locator('input[type="text"]').first();

    // Enter name with leading/trailing spaces
    await input.clear();
    await input.fill('  Spaces Trimmed  ');
    await input.press('Enter');

    // Should appear without extra spaces
    await expect(page.getByText('Spaces Trimmed').first()).toBeVisible({ timeout: 5000 });
  });

  test('should handle special characters in session names', async ({ page }) => {
    await expect(page.getByText('Original Session Name').first()).toBeVisible({ timeout: 5000 });

    await page.getByText('Original Session Name').first().dblclick();
    const input = page.locator('input[type="text"]').first();

    await input.clear();
    await input.fill('Test: Special & Chars! #123 @mention');
    await input.press('Enter');

    await expect(page.getByText('Test: Special & Chars! #123 @mention').first()).toBeVisible({
      timeout: 5000,
    });
  });

  test('should allow renaming same session multiple times', async ({ page }) => {
    await expect(page.getByText('Original Session Name').first()).toBeVisible({ timeout: 5000 });

    // First rename
    await page.getByText('Original Session Name').first().dblclick();
    let input = page.locator('input').first();
    await input.clear();
    await input.fill('First Rename');
    await input.press('Enter');
    await expect(page.getByText('First Rename').first()).toBeVisible({ timeout: 5000 });

    // Second rename
    await page.getByText('First Rename').first().dblclick();
    input = page.locator('input').first();
    await input.clear();
    await input.fill('Second Rename');
    await input.press('Enter');
    await expect(page.getByText('Second Rename').first()).toBeVisible({ timeout: 5000 });

    // Third rename
    await page.getByText('Second Rename').first().dblclick();
    input = page.locator('input').first();
    await input.clear();
    await input.fill('Third Rename');
    await input.press('Enter');
    await expect(page.getByText('Third Rename').first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Session Archive Functionality', { tag: '@mock' }, () => {
  test.beforeEach(async ({ page }) => {
    // Track archived sessions
    const archivedSessions = new Set<string>();

    // Additional mock API endpoints for archive operations
    await page.route('**/api/agents/test', async (route: Route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }

      const postData = route.request().postDataJSON();

      // Mock contexts/list - return sessions, filtering out archived ones
      if (postData?.method === 'contexts/list') {
        const allSessions = [
          {
            id: 'session-1',
            name: 'First Session',
            isArchived: archivedSessions.has('session-1'),
            createdAt: '01/10/2025 10:00:00 AM',
            updatedAt: '01/10/2025 10:30:00 AM',
            status: 'Running',
          },
          {
            id: 'session-2',
            name: 'Second Session',
            isArchived: archivedSessions.has('session-2'),
            createdAt: '01/10/2025 11:00:00 AM',
            updatedAt: '01/10/2025 11:30:00 AM',
            status: 'Running',
          },
        ];

        // Filter out archived sessions
        const visibleSessions = allSessions.filter((s) => !s.isArchived);

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: postData.id,
            result: visibleSessions,
          }),
        });
        return;
      }

      // Mock context/update for archiving (SINGULAR, not plural!)
      if (postData?.method === 'context/update') {
        const contextId = postData.params?.Id;
        const isArchived = postData.params?.IsArchived;

        if (isArchived) {
          archivedSessions.add(contextId);
        }

        console.log('[SSE FIXTURE] context/update (archive):', { contextId, isArchived });

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: postData.id,
            result: {
              id: contextId,
              isArchived: isArchived,
              status: 'Running',
            },
          }),
        });
        return;
      }

      await route.continue();
    });

    await page.goto(
      `http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}&multiSession=true`
    );
    await page.waitForLoadState('networkidle');
  });

  test('should archive session via archive button', async ({ page }) => {
    // Wait for sessions to appear (sessions are in reverse chronological order)
    await expect(page.getByText('First Session').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Second Session').first()).toBeVisible({ timeout: 5000 });

    // Hover over second session (appears first in the list) to reveal archive button
    await page.getByText('Second Session').first().hover();

    // Set up dialog handler to accept the confirmation
    page.on('dialog', (dialog) => {
      expect(dialog.message()).toContain('Archive');
      dialog.accept();
    });

    // Set up request listener to verify API call for session-2
    const archiveRequestPromise = page.waitForRequest((request) => {
      if (!request.url().includes('/api/agents/test')) return false;
      if (request.method() !== 'POST') return false;

      try {
        const postData = request.postDataJSON();
        return (
          postData?.method === 'context/update' &&
          postData?.params?.Id === 'session-2' &&
          postData?.params?.IsArchived === true
        );
      } catch {
        return false;
      }
    });

    // Click first archive button (which belongs to Second Session)
    const archiveButton = page
      .getByRole('button', { name: /archive/i })
      .or(page.locator('button[title="Archive"]'))
      .first();
    await archiveButton.click();

    // Verify the API request was made with correct parameters
    const archiveRequest = await archiveRequestPromise;
    const requestData = archiveRequest.postDataJSON();
    expect(requestData.method).toBe('context/update');
    expect(requestData.params.Id).toBe('session-2');
    expect(requestData.params.IsArchived).toBe(true);

    // Second session should disappear from list
    await expect(page.getByText('Second Session').first()).not.toBeVisible({ timeout: 5000 });

    // First session should still be visible
    await expect(page.getByText('First Session').first()).toBeVisible();
  });

  test('should show confirmation dialog before archiving', async ({ page }) => {
    await expect(page.getByText('First Session').first()).toBeVisible({ timeout: 5000 });

    await page.getByText('First Session').first().hover();

    // Set up dialog handler to verify message and cancel
    let dialogShown = false;
    page.on('dialog', (dialog) => {
      dialogShown = true;
      expect(dialog.message()).toContain('Archive');
      expect(dialog.message()).toContain('chat');
      dialog.dismiss(); // Cancel the archive
    });

    const archiveButton = page
      .getByRole('button', { name: /archive/i })
      .or(page.locator('button[title="Archive"]'))
      .first();
    await archiveButton.click();

    // Wait a bit to ensure dialog was shown
    await page.waitForTimeout(500);
    expect(dialogShown).toBe(true);

    // Session should still be visible since we cancelled
    await expect(page.getByText('First Session').first()).toBeVisible();
  });

  test('should update session list immediately after archiving', async ({ page }) => {
    await expect(page.getByText('First Session').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Second Session').first()).toBeVisible({ timeout: 5000 });

    // Archive first session
    await page.getByText('First Session').first().hover();
    page.on('dialog', (dialog) => dialog.accept());
    await page.locator('button[title="Archive"]').first().click();

    // Should immediately disappear
    await expect(page.getByText('First Session').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Second Session').first()).not.toBeVisible();

    // Archive second session
    await page.getByText('First Session').first().hover();
    await page.locator('button[title="Archive"]').first().click();

    // Should immediately disappear
    await expect(page.getByText('First Session').first()).not.toBeVisible({ timeout: 5000 });

    // Should show empty state
    await expect(page.getByText('No chats yet')).toBeVisible({ timeout: 5000 });
  });

  test('should allow archiving multiple sessions', async ({ page }) => {
    await expect(page.getByText('First Session').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Second Session').first()).toBeVisible({ timeout: 5000 });

    // Set up auto-accept for all dialogs
    page.on('dialog', (dialog) => dialog.accept());

    // Archive first session
    await page.getByText('Second Session').first().hover();
    await page.locator('button[title="Archive"]').first().click();
    await expect(page.getByText('Second Session').first()).not.toBeVisible({ timeout: 3000 });

    // Archive second session
    await page.getByText('First Session').first().hover();
    await page.locator('button[title="Archive"]').first().click();
    await expect(page.getByText('First Session').first()).not.toBeVisible({ timeout: 3000 });

    // Both should be gone
    await expect(page.getByText('First Session').first()).not.toBeVisible();
    await expect(page.getByText('Second Session').first()).not.toBeVisible();
  });
});

test.describe('Rename and Archive Integration', { tag: '@mock' }, () => {
  test.beforeEach(async ({ page }) => {
    const archivedSessions = new Set<string>();
    const sessionNames = new Map<string, string>([['session-1', 'Test Session']]);

    // Additional mock API endpoints for integrated rename/archive operations
    await page.route('**/api/agents/test', async (route: Route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }

      const postData = route.request().postDataJSON();

      if (postData?.method === 'contexts/list') {
        const sessions = Array.from(sessionNames.entries())
          .filter(([id]) => !archivedSessions.has(id))
          .map(([id, name]) => ({
            id,
            name,
            isArchived: false,
            createdAt: '01/10/2025 10:00:00 AM',
            updatedAt: '01/10/2025 10:30:00 AM',
            status: 'Running',
          }));

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: postData.id,
            result: sessions,
          }),
        });
        return;
      }

      if (postData?.method === 'context/update') {
        const contextId = postData.params?.Id;
        const newName = postData.params?.Name;
        const isArchived = postData.params?.IsArchived;

        if (newName) {
          sessionNames.set(contextId, newName);
        }
        if (isArchived) {
          archivedSessions.add(contextId);
        }

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: postData.id,
            result: {
              id: contextId,
              name: sessionNames.get(contextId),
              isArchived: isArchived || false,
            },
          }),
        });
        return;
      }

      await route.continue();
    });

    await page.goto(
      `http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}&multiSession=true`
    );
    await page.waitForLoadState('networkidle');
  });

  test('should rename session and then archive it', async ({ page }) => {
    await expect(page.getByText('Test Session').first()).toBeVisible({ timeout: 5000 });

    // First rename
    await page.getByText('Test Session').first().dblclick();
    const input = page.locator('input').first();
    await input.clear();
    await input.fill('Renamed Session');
    await input.press('Enter');
    await expect(page.getByText('Renamed Session').first()).toBeVisible({ timeout: 5000 });

    // Then archive
    await page.getByText('Renamed Session').first().hover();
    page.on('dialog', (dialog) => dialog.accept());
    await page.locator('button[title="Archive"]').first().click();

    await expect(page.getByText('Renamed Session').first()).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText('No chats yet')).toBeVisible();
  });

  test('should not allow renaming after archiving', async ({ page }) => {
    await expect(page.getByText('Test Session').first()).toBeVisible({ timeout: 5000 });

    // Archive first
    await page.getByText('Test Session').first().hover();
    page.on('dialog', (dialog) => dialog.accept());
    await page.locator('button[title="Archive"]').first().click();

    // Session should be gone
    await expect(page.getByText('Test Session').first()).not.toBeVisible({ timeout: 5000 });

    // Can't rename what's not visible - no input should be present for renaming
    const input = page.locator('input[type="text"]');
    await expect(input).not.toBeVisible();
  });
});

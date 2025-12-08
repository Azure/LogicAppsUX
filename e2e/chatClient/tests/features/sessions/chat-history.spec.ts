/**
 * Chat History E2E Tests
 *
 * Tests for loading and displaying historical chat sessions:
 * - Loading existing sessions from contexts/list
 * - Loading messages for a specific session via tasks/list
 * - Displaying historical messages in the chat interface
 * - Switching between different historical sessions
 */

import { test, expect } from '../../../fixtures/sse-fixtures';

// Agent card URL - intercepted by our fixture
const AGENT_CARD_URL = 'http://localhost:3001/api/agents/test/.well-known/agent-card.json';

test.describe('Chat History Loading', { tag: '@mock' }, () => {
  test('should load list of existing chat sessions on initial load', async ({ page }) => {
    // Set up request listener BEFORE navigation
    const contextsListPromise = page.waitForRequest((request) => {
      const postData = request.postDataJSON();
      return postData?.method === 'contexts/list';
    });

    // Navigate to app
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}&withHistory=true`);
    await page.waitForLoadState('networkidle');

    // Verify contexts/list request was made
    const contextsRequest = await contextsListPromise;
    const requestBody = contextsRequest.postDataJSON();

    expect(requestBody.method).toBe('contexts/list');
    expect(requestBody.params).toMatchObject({
      limit: expect.any(Number),
      includeArchived: false,
      includeLastTask: true,
    });
  });

  test('should display existing sessions in the sidebar', async ({ page }) => {
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}&withHistory=true`);
    await page.waitForLoadState('networkidle');

    // Wait for sessions to load and render
    await page.waitForTimeout(1000);

    // Should display "Chats" heading in sidebar
    await expect(page.getByRole('heading', { name: 'Chats' })).toBeVisible({ timeout: 5000 });

    // Should display session cards with names and dates
    // Each session is a group (Card) containing the name and date
    const session1 = page.getByRole('group').filter({ hasText: 'Project Discussion' }).filter({ hasText: '1/10/2025' });
    await expect(session1).toBeVisible({ timeout: 5000 });

    const session2 = page.getByRole('group').filter({ hasText: 'Bug Investigation' }).filter({ hasText: '1/9/2025' });
    await expect(session2).toBeVisible({ timeout: 5000 });

    // Should show the "New Chat" button when sessions exist
    const newChatButton = page.getByRole('button', { name: /new chat/i });
    await expect(newChatButton).toBeVisible({ timeout: 5000 });
  });

  test('should handle empty chat history gracefully', async ({ page }) => {
    // Navigate with emptyHistory=true to get empty sessions array
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}&emptyHistory=true`);
    await page.waitForLoadState('networkidle');

    // When there are no sessions, should show "Start a new chat" button
    const newChatButton = page.getByRole('button', { name: /start a new chat/i });
    await expect(newChatButton).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Loading Messages for Historical Session', { tag: '@mock' }, () => {
  test('should load messages when clicking on a historical session', async ({ page }) => {
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}&withHistory=true`);
    await page.waitForLoadState('networkidle');

    // Wait for sessions to load
    await page.waitForTimeout(1000);

    // Click on the SECOND session in the sidebar (Bug Investigation) to trigger a new tasks/list request
    // The first session might already be loaded on initial page load
    const sessionItem = page.getByRole('group').filter({ hasText: 'Bug Investigation' }).filter({ hasText: '1/9/2025' });
    await expect(sessionItem).toBeVisible({ timeout: 5000 });

    // Set up request listener AFTER initial load but BEFORE clicking
    // Use a promise that filters for the specific session
    const tasksListPromise = page.waitForRequest((request) => {
      try {
        const postData = request.postDataJSON();
        return postData?.method === 'tasks/list' && postData?.params?.Id === 'session-2';
      } catch {
        return false;
      }
    });

    await sessionItem.click();

    // Verify tasks/list request was made with context ID for session-2
    const tasksRequest = await tasksListPromise;
    const requestBody = tasksRequest.postDataJSON();

    expect(requestBody.method).toBe('tasks/list');
    expect(requestBody.params).toHaveProperty('Id');
    expect(requestBody.params.Id).toBe('session-2'); // Our mock data uses session-2 for Bug Investigation
  });

  test('should display historical messages in correct order', async ({ page }) => {
    // Enable multi-session mode to load the multi-session UI with chat history
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}&multiSession=true&withHistory=true`);
    await page.waitForLoadState('networkidle');

    // Wait for sessions to load
    await page.waitForTimeout(1000);

    // Click on the second session (Bug Investigation) to load its messages
    const sessionItem = page.getByRole('group').filter({ hasText: 'Bug Investigation' }).filter({ hasText: '1/9/2025' });
    await expect(sessionItem).toBeVisible({ timeout: 5000 });
    await sessionItem.click();

    // Wait for messages to load
    await page.waitForTimeout(2000);

    // Verify historical messages from session-2 ("Bug Investigation") are visible
    await expect(page.getByText('Help me debug this timeout issue')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('The timeout is likely caused by the database connection pool')).toBeVisible({ timeout: 5000 });
  });

  test('should show both user and assistant messages from history', async ({ page }) => {
    // Enable multi-session mode to load the multi-session UI with chat history
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}&multiSession=true&withHistory=true`);
    await page.waitForLoadState('networkidle');

    // Wait for sessions to load
    await page.waitForTimeout(1000);

    // Click on the second session (Bug Investigation) to load its messages
    const sessionItem = page.getByRole('group').filter({ hasText: 'Bug Investigation' }).filter({ hasText: '1/9/2025' });
    await expect(sessionItem).toBeVisible({ timeout: 5000 });
    await sessionItem.click();

    // Wait for messages to load
    await page.waitForTimeout(2000);

    // Verify user message is visible
    await expect(page.getByText('Help me debug this timeout issue')).toBeVisible({ timeout: 5000 });

    // Verify assistant/agent message is visible
    await expect(page.getByText('The timeout is likely caused by the database connection pool')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Session Switching', { tag: '@mock' }, () => {
  test('should switch between different historical sessions', async ({ page }) => {
    // Enable multi-session mode to see session list
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}&multiSession=true&withHistory=true`);
    await page.waitForLoadState('networkidle');

    // Wait for sessions to load
    await page.waitForTimeout(1000);

    // Verify both sessions are visible
    const session1 = page.getByRole('group').filter({ hasText: 'Project Discussion' }).filter({ hasText: '1/10/2025' });
    const session2 = page.getByRole('group').filter({ hasText: 'Bug Investigation' }).filter({ hasText: '1/9/2025' });
    await expect(session1).toBeVisible({ timeout: 5000 });
    await expect(session2).toBeVisible({ timeout: 5000 });

    // Click first session
    await session1.click();
    await page.waitForTimeout(500);

    // Set up listener for second session's tasks/list request
    const tasksListPromise = page.waitForRequest((request) => {
      const postData = request.postDataJSON();
      return postData?.method === 'tasks/list' && postData?.params?.Id === 'session-2';
    });

    // Click second session
    await session2.click();

    // Verify tasks/list request for session-2
    const tasksRequest = await tasksListPromise;
    const requestBody = tasksRequest.postDataJSON();
    expect(requestBody.method).toBe('tasks/list');
    expect(requestBody.params.Id).toBe('session-2');
  });

  test('should preserve active session indicator', async ({ page }) => {
    // Enable multi-session mode to see session list
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}&multiSession=true&withHistory=true`);
    await page.waitForLoadState('networkidle');

    // Wait for sessions to load
    await page.waitForTimeout(1000);

    // Get session items by their visible text
    const session1 = page.getByRole('group').filter({ hasText: 'Project Discussion' }).filter({ hasText: '1/10/2025' });
    const session2 = page.getByRole('group').filter({ hasText: 'Bug Investigation' }).filter({ hasText: '1/9/2025' });

    await expect(session1).toBeVisible({ timeout: 5000 });
    await expect(session2).toBeVisible({ timeout: 5000 });

    // Click first session and verify its messages are displayed
    await session1.click();
    await page.waitForTimeout(1000);

    // Verify first session's messages are visible (indicating it's active)
    await expect(page.getByText('Tell me about the project architecture')).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByText('The project uses a modern microservices architecture')).toBeVisible({ timeout: 5000 });

    // Click second session and verify its messages are now displayed
    await session2.click();
    await page.waitForTimeout(1000);

    // Verify second session's messages are visible (indicating it's now active)
    await expect(page.getByText('Help me debug this timeout issue')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('The timeout is likely caused by the database connection pool')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Chat History with Authentication', { tag: '@mock' }, () => {
  test('should include API key in contexts/list request', async ({ page }) => {
    const apiKey = 'history-api-key-123';

    // Set up request listener BEFORE navigation
    const contextsListPromise = page.waitForRequest((request) => {
      const postData = request.postDataJSON();
      return postData?.method === 'contexts/list';
    });

    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}&apiKey=${apiKey}&withHistory=true`);
    await page.waitForLoadState('networkidle');

    const contextsRequest = await contextsListPromise;
    const headers = contextsRequest.headers();

    expect(headers['x-api-key']).toBe(apiKey);
  });

  test('should include OBO token in contexts/list request', async ({ page }) => {
    const oboToken = 'history-obo-token-456';

    // Set up request listener BEFORE navigation
    const contextsListPromise = page.waitForRequest((request) => {
      const postData = request.postDataJSON();
      return postData?.method === 'contexts/list';
    });

    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}&oboUserToken=${oboToken}&withHistory=true`);
    await page.waitForLoadState('networkidle');

    const contextsRequest = await contextsListPromise;
    const headers = contextsRequest.headers();

    expect(headers['x-ms-obo-usertoken']).toBe(`Key ${oboToken}`);
  });

  test('should include API key in tasks/list request when loading session', async ({ page }) => {
    const apiKey = 'history-tasks-api-key-789';

    // Navigate with API key and multiSession mode
    await page.goto(
      `http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}&apiKey=${apiKey}&multiSession=true&withHistory=true`
    );
    await page.waitForLoadState('networkidle');

    // Wait for sessions to load
    await page.waitForTimeout(1000);

    // Set up request listener for tasks/list
    const tasksListPromise = page.waitForRequest((request) => {
      const postData = request.postDataJSON();
      return postData?.method === 'tasks/list';
    });

    // Click on the second session (Bug Investigation) to trigger tasks/list
    const sessionItem = page.getByRole('group').filter({ hasText: 'Bug Investigation' }).filter({ hasText: '1/9/2025' });
    await expect(sessionItem).toBeVisible({ timeout: 5000 });
    await sessionItem.click();

    // Verify API key header in tasks/list request
    const tasksRequest = await tasksListPromise;
    const headers = tasksRequest.headers();
    expect(headers['x-api-key']).toBe(apiKey);
  });
});

test.describe('Chat History Error Handling', { tag: '@mock' }, () => {
  test('should handle contexts/list failure gracefully', async ({ page }) => {
    // Use errorHistory=true to trigger an error response from contexts/list
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}&errorHistory=true`);
    await page.waitForLoadState('networkidle');

    // Wait a moment for the error to be handled
    await page.waitForTimeout(1000);

    // App should still render even if contexts/list fails - should show "Start a new chat" button
    const newChatButton = page.getByRole('button', { name: /start a new chat/i });
    await expect(newChatButton).toBeVisible({ timeout: 5000 });
  });

  test('should handle tasks/list failure gracefully', async ({ page }) => {
    // Use errorTasks=true to trigger an error response from tasks/list
    // Use multiSession mode to see the session list
    await page.goto(
      `http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}&multiSession=true&withHistory=true&errorTasks=true`
    );
    await page.waitForLoadState('networkidle');

    // Wait for sessions to load
    await page.waitForTimeout(1000);

    // Click on a session to trigger tasks/list
    const sessionItem = page.getByRole('group').filter({ hasText: 'Project Discussion' }).first();
    await expect(sessionItem).toBeVisible({ timeout: 5000 });
    await sessionItem.click();

    // Wait for error to be handled
    await page.waitForTimeout(1000);

    // Even if tasks/list fails, UI should not crash
    // The chat interface should still be visible (input field should still be present)
    const messageInput = page.locator('textarea').first();
    await expect(messageInput).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Creating New Chat with Existing History', { tag: '@mock' }, () => {
  test('should allow creating new chat while history exists', async ({ page }) => {
    // Enable multiSession mode to see the "New Chat" button
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}&multiSession=true&withHistory=true`);
    await page.waitForLoadState('networkidle');

    // Wait for sessions to load
    await page.waitForTimeout(1000);

    // Verify existing sessions are displayed
    const session1 = page.getByRole('group').filter({ hasText: 'Project Discussion' });
    await expect(session1).toBeVisible({ timeout: 5000 });

    // Click "New Chat" button (not "Start a new chat" - that's for empty state)
    const newChatButton = page.getByRole('button', { name: /new chat/i });
    await expect(newChatButton).toBeVisible({ timeout: 5000 });
    await newChatButton.click();

    // Should show input field for new chat
    const messageInput = page.locator('textarea').first();
    await expect(messageInput).toBeVisible({ timeout: 5000 });
    await expect(messageInput).toBeEmpty();
  });

  test('should create new session when sending message in new chat', async ({ page }) => {
    // Enable multiSession mode
    await page.goto(`http://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}&multiSession=true&withHistory=true`);
    await page.waitForLoadState('networkidle');

    // Wait for sessions to load
    await page.waitForTimeout(1000);

    // Click "New Chat" button
    const newChatButton = page.getByRole('button', { name: /new chat/i });
    await expect(newChatButton).toBeVisible({ timeout: 5000 });
    await newChatButton.click();

    // Wait for input to be visible
    const messageInput = page.locator('textarea').first();
    await expect(messageInput).toBeVisible({ timeout: 5000 });

    // Set up listener for message/stream request to verify new message is sent
    const messageStreamPromise = page.waitForRequest((request) => {
      const postData = request.postDataJSON();
      return postData?.method === 'message/stream';
    });

    // Fill the input - this should enable the send button
    await messageInput.fill('New chat message');

    // Wait for send button to be enabled (not disabled)
    const sendButton = page.getByRole('button', { name: /send message/i });
    await expect(sendButton).toBeEnabled({ timeout: 5000 });
    await sendButton.click();

    // Verify message/stream request was made
    const messageRequest = await messageStreamPromise;
    const requestBody = messageRequest.postDataJSON();
    expect(requestBody.method).toBe('message/stream');
    expect(requestBody.params?.message?.parts?.[0]?.text).toBe('New chat message');
  });
});

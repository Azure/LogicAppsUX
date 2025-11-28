/**
 * Agent Card fixtures for E2E testing
 *
 * Provides mock agent card data and setup helpers
 */

import type { Page, Route } from '@playwright/test';

/**
 * Mock agent card URL for testing (HTTP for E2E testing)
 */
export const MOCK_AGENT_CARD_URL =
  'http://localhost:3001/api/agents/test/.well-known/agent-card.json';

/**
 * Default mock agent card data
 */
export const MOCK_AGENT_CARD = {
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

/**
 * Setup agent card mock for tests
 */
export const setupAgentCardMock = async (page: Page, agentCard = MOCK_AGENT_CARD) => {
  await page.route('**/api/agents/**/.well-known/agent-card.json', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(agentCard),
    });
  });
};

/**
 * Base URL for the chat client app
 */
export const CHAT_CLIENT_BASE_URL = 'http://localhost:3001';

/**
 * Get URL with agent card parameter
 */
export const getUrlWithAgentCard = (path = '/', agentCardUrl = MOCK_AGENT_CARD_URL): string => {
  return `${CHAT_CLIENT_BASE_URL}${path}?agentCard=${encodeURIComponent(agentCardUrl)}`;
};

/**
 * Navigate to page with agent card
 */
export const gotoWithAgentCard = async (page: Page, path = '/'): Promise<void> => {
  await page.goto(getUrlWithAgentCard(path));
};

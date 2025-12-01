/**
 * Mock Server Configuration
 *
 * Central configuration for mocking A2A protocol endpoints
 */

import type { Page } from '@playwright/test';
import { mockSSEEndpoint, type SSEMockConfig } from '../utils/sse-mock-helpers';
import {
  createSimpleTextResponse,
  createStreamingTextResponse,
  createAuthRequiredResponse,
  createNetworkErrorResponse,
  createServerErrorResponse,
} from '../fixtures/mock-responses';

/**
 * Default A2A endpoint URL (HTTP for E2E testing)
 */
export const A2A_ENDPOINT = 'http://localhost:3001/api/chat';

/**
 * Mock server scenarios
 */
export type MockScenario =
  | 'success'
  | 'streaming'
  | 'auth-required'
  | 'network-error'
  | 'server-error'
  | 'timeout'
  | 'custom';

/**
 * Setup mock server for a scenario
 */
export const setupMockServer = async (
  page: Page,
  scenario: MockScenario,
  customConfig?: SSEMockConfig
) => {
  let config: SSEMockConfig;

  switch (scenario) {
    case 'success':
      config = {
        events: createSimpleTextResponse('Hello! How can I help you today?'),
        delay: 100,
      };
      break;

    case 'streaming':
      config = {
        events: createStreamingTextResponse(
          'This is a longer response that will be streamed in chunks to simulate real-time typing.',
          10 // chunk size
        ),
        delay: 50, // 50ms between chunks
      };
      break;

    case 'auth-required':
      config = {
        events: createAuthRequiredResponse('https://consent.example.com/auth'),
      };
      break;

    case 'network-error':
      config = {
        events: createNetworkErrorResponse(),
      };
      break;

    case 'server-error':
      config = {
        events: createServerErrorResponse(),
      };
      break;

    case 'timeout':
      config = {
        events: [],
        delay: 10000, // Simulate timeout by not sending any events
      };
      break;

    case 'custom':
      if (!customConfig) {
        throw new Error('Custom scenario requires customConfig parameter');
      }
      config = customConfig;
      break;
  }

  await mockSSEEndpoint(page, A2A_ENDPOINT, config);
};

/**
 * Setup mock server with multiple sequential responses
 */
export const setupMockServerSequence = async (page: Page, responses: SSEMockConfig[]) => {
  let responseIndex = 0;

  await page.route(A2A_ENDPOINT, async (route) => {
    const config = responses[responseIndex] || responses[responses.length - 1];
    responseIndex++;

    const { statusCode = 200, headers = {}, events } = config;

    const defaultHeaders = {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      ...headers,
    };

    let body = '';
    for (const event of events) {
      const formatted =
        (event.event ? `event: ${event.event}\n` : '') +
        (event.id ? `id: ${event.id}\n` : '') +
        `data: ${event.data}\n\n`;
      body += formatted;
    }

    await route.fulfill({
      status: statusCode,
      headers: defaultHeaders,
      body,
    });
  });
};

/**
 * Clear all mock routes
 */
export const clearMockServer = async (page: Page) => {
  await page.unrouteAll();
};

/**
 * Setup default successful mock for all tests
 */
export const setupDefaultMocks = async (page: Page) => {
  await setupMockServer(page, 'success');
};

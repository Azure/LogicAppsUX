/**
 * SSE Mock Helpers for E2E Tests
 *
 * Utilities for mocking Server-Sent Events in Playwright tests
 */

import type { Page, Route } from '@playwright/test';
import type { SSEEvent } from '../fixtures/mock-responses';
import { formatSSEEvent } from '../fixtures/mock-responses';

/**
 * Configuration for SSE mock
 */
export type SSEMockConfig = {
  events: SSEEvent[];
  delay?: number; // Delay between events in ms
  dropConnectionAt?: number; // Drop connection after N events
  statusCode?: number; // HTTP status code
  headers?: Record<string, string>;
  errorAfter?: number; // Trigger error after N events
};

/**
 * Create a ReadableStream that emits SSE events
 */
export const createSSEStream = (config: SSEMockConfig): ReadableStream<Uint8Array> => {
  const { events, delay = 0, dropConnectionAt, errorAfter } = config;
  let eventIndex = 0;

  return new ReadableStream({
    async start(controller) {
      for (const event of events) {
        // Check if we should trigger an error
        if (errorAfter !== undefined && eventIndex >= errorAfter) {
          controller.error(new Error('Mock SSE error'));
          return;
        }

        // Check if we should drop the connection
        if (dropConnectionAt !== undefined && eventIndex >= dropConnectionAt) {
          controller.close();
          return;
        }

        // Add delay if specified
        if (delay > 0 && eventIndex > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        // Send the event
        const formatted = formatSSEEvent(event);
        controller.enqueue(new TextEncoder().encode(formatted));
        eventIndex++;
      }

      controller.close();
    },
  });
};

/**
 * Mock an SSE endpoint with Playwright route
 */
export const mockSSEEndpoint = async (page: Page, url: string, config: SSEMockConfig) => {
  await page.route(url, async (route: Route) => {
    const { statusCode = 200, headers = {} } = config;

    const defaultHeaders = {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      ...headers,
    };

    // For Playwright, we need to fulfill with a string body
    // We'll concatenate all events
    const { events } = config;
    let body = '';

    for (let i = 0; i < events.length; i++) {
      // Check for drop connection
      if (config.dropConnectionAt !== undefined && i >= config.dropConnectionAt) {
        break;
      }

      // Check for error
      if (config.errorAfter !== undefined && i >= config.errorAfter) {
        break;
      }

      const event = events[i];
      body += formatSSEEvent(event);

      // For immediate responses, we can send all at once
      // For delayed responses, we need a different approach
    }

    await route.fulfill({
      status: statusCode,
      headers: defaultHeaders,
      body,
    });
  });
};

/**
 * Mock SSE endpoint with custom handler
 */
export const mockSSEWithHandler = async (
  page: Page,
  url: string,
  handler: (request: Request) => Promise<SSEMockConfig>
) => {
  await page.route(url, async (route: Route) => {
    const request = route.request();

    // Convert Playwright request to standard Request
    const standardRequest = new Request(request.url(), {
      method: request.method(),
      headers: request.headers(),
      body: request.postData() || undefined,
    });

    const config = await handler(standardRequest);
    const { statusCode = 200, headers = {}, events } = config;

    const defaultHeaders = {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      ...headers,
    };

    let body = '';
    for (const event of events) {
      body += formatSSEEvent(event);
    }

    await route.fulfill({
      status: statusCode,
      headers: defaultHeaders,
      body,
    });
  });
};

/**
 * Wait for SSE connection to be established
 */
export const waitForSSEConnection = async (page: Page, url: string, timeout = 5000) => {
  return page.waitForRequest(
    (request) => request.url().includes(url) && request.method() === 'POST',
    { timeout }
  );
};

/**
 * Wait for SSE event in page
 */
export const waitForSSEEvent = async (
  page: Page,
  eventType: string,
  timeout = 5000
): Promise<unknown> => {
  return page.evaluate(
    ({ eventType, timeout }) => {
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`Timeout waiting for SSE event: ${eventType}`));
        }, timeout);

        // This assumes there's a global event emitter or similar
        // You may need to adjust this based on your app's architecture
        const handler = (event: CustomEvent) => {
          clearTimeout(timeoutId);
          resolve(event.detail);
        };

        window.addEventListener(eventType, handler as EventListener, { once: true });
      });
    },
    { eventType, timeout }
  );
};

/**
 * Simulate SSE connection drop
 */
export const simulateSSEConnectionDrop = async (page: Page, url: string) => {
  await page.route(url, (route) => {
    route.abort('failed');
  });
};

/**
 * Simulate SSE network error
 */
export const simulateSSENetworkError = async (page: Page, url: string) => {
  await page.route(url, (route) => {
    route.abort('internetdisconnected');
  });
};

/**
 * Simulate SSE timeout
 */
export const simulateSSETimeout = async (page: Page, url: string) => {
  await page.route(url, (route) => {
    route.abort('timedout');
  });
};

/**
 * Clear all SSE mocks
 */
export const clearSSEMocks = async (page: Page, url?: string) => {
  if (url) {
    await page.unroute(url);
  } else {
    await page.unrouteAll();
  }
};

/**
 * Capture SSE requests
 */
export type CapturedSSERequest = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
  timestamp: number;
};

export class SSERequestCapture {
  private requests: CapturedSSERequest[] = [];

  async capture(page: Page, url: string) {
    await page.route(url, async (route) => {
      const request = route.request();

      this.requests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        body: request.postData() ? JSON.parse(request.postData()!) : null,
        timestamp: Date.now(),
      });

      // Continue with the actual request
      await route.continue();
    });
  }

  getRequests(): CapturedSSERequest[] {
    return [...this.requests];
  }

  getLastRequest(): CapturedSSERequest | undefined {
    return this.requests[this.requests.length - 1];
  }

  clear() {
    this.requests = [];
  }

  getRequestCount(): number {
    return this.requests.length;
  }
}

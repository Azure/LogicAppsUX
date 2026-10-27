/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { parseJson } from './parseJson';
import { sendRequestWithExtTimeout } from './requestUtils';
import { HTTP_METHODS } from '@microsoft/logic-apps-shared';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { nonNullProp } from '@microsoft/vscode-azext-utils';

interface ICachedFeed {
  data: Record<string, any>;
  nextRefreshTime: number;
}

interface JsonFeedRetryOptions {
  maxAttempts?: number;
  retryDelayMs?: number;
  totalTimeoutMs?: number;
  sleep?: (delayMs: number) => Promise<void>;
}

export interface JsonFeedOptions {
  retry?: JsonFeedRetryOptions;
}

const cachedFeeds: Map<string, ICachedFeed> = new Map<string, ICachedFeed>();

function getErrorStatus(error: unknown): number | undefined {
  let current = error;
  while (current && typeof current === 'object') {
    const candidate = current as { status?: unknown; statusCode?: unknown; response?: { status?: unknown }; cause?: unknown };
    const status = candidate.response?.status ?? candidate.status ?? candidate.statusCode;
    if (typeof status === 'number') {
      return status;
    }
    current = candidate.cause;
  }
  return undefined;
}

function isRetryableFeedError(error: unknown): boolean {
  const status = getErrorStatus(error);
  if (status !== undefined) {
    return status === 408 || status === 429 || status >= 500;
  }
  const codes = new Set(['EAI_AGAIN', 'ECONNRESET', 'ENETUNREACH', 'ETIMEDOUT']);
  let current = error;
  while (current && typeof current === 'object') {
    const candidate = current as { code?: unknown; cause?: unknown };
    if (typeof candidate.code === 'string' && codes.has(candidate.code)) {
      return true;
    }
    if (current instanceof AggregateError && current.errors.some(isRetryableFeedError)) {
      return true;
    }
    current = candidate.cause;
  }
  return false;
}

async function requestJsonFeed(context: IActionContext, url: string, retry: JsonFeedRetryOptions = {}): Promise<string> {
  const maxAttempts = retry.maxAttempts ?? 3;
  const retryDelayMs = retry.retryDelayMs ?? 250;
  const totalTimeoutMs = retry.totalTimeoutMs ?? 45_000;
  const sleep = retry.sleep ?? ((delayMs: number) => new Promise((resolve) => setTimeout(resolve, delayMs)));
  const deadline = Date.now() + totalTimeoutMs;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      throw new Error(`JSON feed request deadline expired: ${url}`);
    }
    try {
      const response = await sendRequestWithExtTimeout(context, { method: HTTP_METHODS.GET, url }, remainingMs);
      return nonNullProp(response, 'bodyAsText');
    } catch (error) {
      if (!isRetryableFeedError(error) || attempt === maxAttempts) {
        throw error;
      }
    }
    const waitMs = Math.min(retryDelayMs, deadline - Date.now());
    if (waitMs <= 0) {
      throw new Error(`JSON feed request deadline expired: ${url}`);
    }
    await sleep(waitMs);
  }
  throw new Error(`JSON feed retry contract exhausted unexpectedly: ${url}`);
}

/**
 * Provides some helper logic when getting a json feed:
 * 1. Caches the feed for 10 minutes since these feeds don't change very often and we don't want to make repeated calls to get the same information
 * 2. Sets timeout for getting the feed to 15 seconds since we would rather default to the "backup" logic than wait a long time
 */
export async function getJsonFeed<T extends Record<string, any>>(
  context: IActionContext,
  url: string,
  options: JsonFeedOptions = {}
): Promise<T> {
  let cachedFeed: ICachedFeed | undefined = cachedFeeds.get(url);
  if (!cachedFeed || Date.now() > cachedFeed.nextRefreshTime) {
    const bodyAsText = options.retry
      ? await requestJsonFeed(context, url, options.retry)
      : nonNullProp(await sendRequestWithExtTimeout(context, { method: HTTP_METHODS.GET, url }), 'bodyAsText');
    // NOTE: r.parsedBody doesn't work because these feeds sometimes return with a BOM char or incorrect content-type
    cachedFeed = { data: parseJson(bodyAsText), nextRefreshTime: Date.now() + 10 * 60 * 1000 };
    cachedFeeds.set(url, cachedFeed);
  }

  return cachedFeed.data as T;
}

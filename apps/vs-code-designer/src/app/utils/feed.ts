/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { parseJson } from './parseJson';
import { sendRequestWithExtTimeout } from './requestUtils';
import type { HttpOperationResponse } from '@azure/ms-rest-js';
import { HTTP_METHODS } from '@microsoft/logic-apps-shared';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { nonNullProp } from '@microsoft/vscode-azext-utils';

interface ICachedFeed {
  data: Record<string, any>;
  nextRefreshTime: number;
}

const cachedFeeds: Map<string, ICachedFeed> = new Map<string, ICachedFeed>();

/**
 * Provides some helper logic when getting a json feed:
 * 1. Caches the feed for 10 minutes since these feeds don't change very often and we don't want to make repeated calls to get the same information
 * 2. Sets timeout for getting the feed to 15 seconds since we would rather default to the "backup" logic than wait a long time
 */
export async function getJsonFeed<T extends Record<string, any>>(context: IActionContext, url: string): Promise<T> {
  let cachedFeed: ICachedFeed | undefined = cachedFeeds.get(url);
  if (!cachedFeed || Date.now() > cachedFeed.nextRefreshTime) {
    const response: HttpOperationResponse = await sendRequestWithExtTimeout(context, { method: HTTP_METHODS.GET, url });
    // NOTE: r.parsedBody doesn't work because these feeds sometimes return with a BOM char or incorrect content-type
    cachedFeed = { data: parseJson(nonNullProp(response, 'bodyAsText')), nextRefreshTime: Date.now() + 10 * 60 * 1000 };
    cachedFeeds.set(url, cachedFeed);
  }

  return cachedFeed.data as T;
}

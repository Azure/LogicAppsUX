/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { timeoutKey } from '../../constants';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { RestError } from '@azure/ms-rest-js';
import type { HttpOperationResponse, RequestPrepareOptions, ServiceClient } from '@azure/ms-rest-js';
import type { HTTP_METHODS } from '@microsoft/utils-logic-apps';
import { createGenericClient } from '@microsoft/vscode-azext-azureutils';
import { parseError } from '@microsoft/vscode-azext-utils';
import type { IActionContext, ISubscriptionContext } from '@microsoft/vscode-azext-utils';
import type { IIdentityWizardContext } from '@microsoft/vscode-extension';

/**
 * Checks if it is a timeout error.
 * @param {unknown} error - Error object.
 * @returns {boolean} True if error type is a timeout error.
 */
export function isTimeoutError(error: unknown): boolean {
  return parseError(error).errorType === 'REQUEST_ABORTED_ERROR';
}

export async function sendAzureRequest(
  url: string,
  context: IActionContext | IIdentityWizardContext,
  method: HTTP_METHODS = 'GET',
  subscriptionContext?: ISubscriptionContext
): Promise<HttpOperationResponse> {
  const client: ServiceClient = await createGenericClient(context, subscriptionContext);
  return sendAndParseResponse(client, { url, method });
}

export async function sendRequest(context: IActionContext, options: RequestPrepareOptions): Promise<string> {
  const client: ServiceClient = await createGenericClient(context, undefined);
  const response = await sendAndParseResponse(client, options);
  return response.bodyAsText;
}

async function sendAndParseResponse(client: ServiceClient, options: RequestPrepareOptions): Promise<HttpOperationResponse> {
  try {
    const response = await client.sendRequest(options);
    if (response.status < 200 || response.status >= 300) {
      const errorMessage: string = response.bodyAsText
        ? parseError(response.parsedBody || response.bodyAsText).message
        : localize('unexpectedStatusCode', 'Unexpected status code: {0}', response.status);
      throw new RestError(errorMessage, undefined, response.status, /*request*/ undefined, response, response.bodyAsText);
    } else {
      return response;
    }
  } catch (error) {
    if (isTimeoutError(error)) {
      throw new Error(
        localize('timeoutFeed', 'Request timed out. Modify setting "{0}.{1}" if you want to extend the timeout.', ext.prefix, timeoutKey)
      );
    } else {
      throw error;
    }
  }
}

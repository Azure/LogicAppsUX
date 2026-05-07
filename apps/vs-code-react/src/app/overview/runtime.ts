import type { IHttpClient } from '@microsoft/logic-apps-shared';
import { isRuntimeUp } from '@microsoft/logic-apps-shared';
import type { ICallbackUrlResponse } from '@microsoft/vscode-extension-logic-apps';

interface OverviewRuntimeAvailabilityOptions {
  apiVersion: string;
  baseUrl?: string;
  callbackInfo?: ICallbackUrlResponse;
  httpClient?: IHttpClient;
  isLocal?: boolean;
}

export async function isOverviewRuntimeAvailable({
  apiVersion,
  baseUrl,
  callbackInfo,
  httpClient,
  isLocal,
}: OverviewRuntimeAvailabilityOptions): Promise<boolean> {
  if (!baseUrl) {
    return false;
  }

  if (isLocal) {
    return isRuntimeUp(baseUrl);
  }

  if (callbackInfo) {
    return true;
  }

  if (!httpClient) {
    return false;
  }

  try {
    await httpClient.get({
      uri: `${baseUrl}/operationGroups`,
      queryParameters: {
        'api-version': apiVersion,
      },
    });

    return true;
  } catch {
    return false;
  }
}

export function shouldShowLocalDebugError(isLocal: boolean | undefined, isWorkflowRuntimeRunning: boolean): boolean {
  return Boolean(isLocal && !isWorkflowRuntimeRunning);
}

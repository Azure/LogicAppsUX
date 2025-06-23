import { getSessionFromVSCode } from '@microsoft/vscode-azext-azureauth/out/src/getSessionFromVSCode';
import { getConfiguredAzureEnv } from '@microsoft/vscode-azext-azureauth';
import { localize } from '../../../localize';
import type { AzExtTreeItem } from '@microsoft/vscode-azext-utils';

export async function getAuthorizationToken(tenantId?: string): Promise<string> {
  const session = await getSessionFromVSCode(undefined, tenantId, { createIfNone: true });
  return `Bearer ${session?.accessToken}`;
}

/**
 * Retrieves the authorization token from the provided node.
 * @param {AzExtTreeItem} node - The tree item node to retrieve the authorization token from.
 * @returns {Promise<string>} - A promise that resolves to the authorization token.
 */
export async function getAuthorizationTokenFromNode(node: AzExtTreeItem): Promise<string> {
  if (!node) {
    throw new Error(localize('noNode', 'No node provided to retrieve the authorization token.'));
  }

  if (!node.subscription) {
    throw new Error(localize('noSubscription', 'No subscription found for the selected node.'));
  }

  const subAccessToken = await node.subscription.credentials?.getToken();
  if (subAccessToken) {
    return `Bearer ${subAccessToken.token ?? subAccessToken}`;
  }

  return await getAuthorizationToken(node.subscription.tenantId);
}

export async function getCloudHost(): Promise<string> {
  const azureEnvironment = getConfiguredAzureEnv();

  return azureEnvironment?.managementEndpointUrl ?? '';
}

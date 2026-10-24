import { getConfiguredAzureEnv, getSessionFromVSCode } from '@microsoft/vscode-azext-azureauth';
import type { AzExtTreeItem } from '@microsoft/vscode-azext-utils';
import type { AuthenticationSession } from 'vscode';
import * as vscode from 'vscode';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { isAzureDevOpsFederatedCredentialsConfigured } from '../services/VSCodeAzureSubscriptionProvider';

async function getAuthDataFromSubscriptionProvider(tenantId?: string): Promise<AuthenticationSession | undefined> {
  if (!isAzureDevOpsFederatedCredentialsConfigured() || !ext.subscriptionProvider) {
    return undefined;
  }

  const isSignedIn = await ext.subscriptionProvider.isSignedIn(tenantId);
  if (!isSignedIn) {
    await ext.subscriptionProvider.signIn(tenantId);
  }

  const subscriptions = await ext.subscriptionProvider.getSubscriptions(tenantId ? { tenantId } : false);
  const subscription = tenantId ? subscriptions.find((sub) => sub.tenantId === tenantId) : subscriptions[0];
  return subscription?.authentication.getSession();
}

export async function getAuthData(tenantId?: string): Promise<AuthenticationSession | undefined> {
  const providerAuthData = await getAuthDataFromSubscriptionProvider(tenantId);
  if (providerAuthData) {
    return providerAuthData;
  }

  // When silentAuth is enabled (e.g. in automated test environments),
  // use { silent: true } to avoid showing the "wants to sign in" dialog.
  // This returns undefined if no cached session exists, instead of prompting.
  const silentAuth = vscode.workspace.getConfiguration('azureLogicAppsStandard').get<boolean>('silentAuth', false);
  if (silentAuth) {
    const session = await getSessionFromVSCode(undefined, tenantId, { silent: true });
    return session ?? getE2eCliAuthSession(tenantId);
  }
  return await getSessionFromVSCode(undefined, tenantId, { createIfNone: true });
}

export async function getAuthorizationToken(tenantId?: string): Promise<string> {
  const authData = await getAuthData(tenantId);
  return `Bearer ${authData?.accessToken}`;
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

function getE2eCliAuthSession(tenantId?: string): AuthenticationSession | undefined {
  const accessToken = process.env.LA_E2E_CLI_AZURE_ACCESS_TOKEN?.trim();
  if (process.env.VSCODE_RUNNING_TESTS !== '1' || !accessToken) {
    return undefined;
  }

  const effectiveTenantId = tenantId ?? process.env.LA_E2E_CLI_AZURE_TENANT_ID ?? process.env.WORKFLOWS_TENANT_ID ?? 'e2e-cli';
  const clientId = process.env.LA_E2E_CLI_AZURE_CLIENT_ID ?? 'e2e-cli';

  return {
    accessToken,
    id: `e2e-cli-${effectiveTenantId}`,
    account: {
      id: `${clientId}.${effectiveTenantId}`,
      label: 'Azure CLI test session',
    },
    scopes: ['https://management.core.windows.net/.default'],
  };
}

export async function getCloudHost(): Promise<string> {
  const azureEnvironment = getConfiguredAzureEnv();

  return azureEnvironment?.managementEndpointUrl ?? '';
}

import { getSessionFromVSCode } from '@microsoft/vscode-azext-azureauth/out/src/getSessionFromVSCode';
import { getConfiguredAzureEnv } from '@microsoft/vscode-azext-azureauth';

export async function getAuthorizationToken(tenantId?: string): Promise<string> {
  const session = await getSessionFromVSCode(undefined, tenantId, { createIfNone: true });
  return `Bearer ${session?.accessToken}`;
}

export async function getCloudHost(): Promise<string> {
  const azureEnvironment = getConfiguredAzureEnv();

  return azureEnvironment?.managementEndpointUrl ?? '';
}

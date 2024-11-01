import { getAccountCredentials } from '../credentials';
import { getSessionFromVSCode } from '@microsoft/vscode-azext-azureauth/out/src/getSessionFromVSCode';

export async function getAuthorizationToken(tenantId?: string): Promise<string> {
  const session = await getSessionFromVSCode(undefined, tenantId, { createIfNone: true });
  return `Bearer ${session?.accessToken}`;
}

export async function getCloudHost(credentials?: any, tenantId?: string): Promise<string> {
  credentials = credentials ? credentials : await getAccountCredentials(tenantId);

  return credentials ? credentials?.environment?.managementEndpointUrl : '';
}

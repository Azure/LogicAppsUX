import { getAccountCredentials } from '../credentials';
import { WebResource } from '@azure/ms-rest-js';
import type { ServiceClientCredentials } from '@azure/ms-rest-js';

export async function getAuthorizationToken(credentials?: ServiceClientCredentials, tenantId?: string): Promise<string> {
  const webResource: WebResource = new WebResource();

  credentials = await getAccountCredentials(tenantId);
  await credentials?.signRequest(webResource);

  return webResource.headers.get('authorization') ?? webResource.headers['authorization'];
}

export async function getCloudHost(credentials?: any, tenantId?: string): Promise<string> {
  credentials = credentials ? credentials : await getAccountCredentials(tenantId);

  return credentials ? credentials?.environment?.managementEndpointUrl : '';
}

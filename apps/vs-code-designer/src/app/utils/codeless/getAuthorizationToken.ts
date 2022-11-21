import { ext } from '../../../extensionVariables';
import { WebResource } from '@azure/ms-rest-js';
import type { ServiceClientCredentials } from '@azure/ms-rest-js';

export async function getAuthorizationToken(credentials?: ServiceClientCredentials, tenantId?: string): Promise<string> {
  const webResource: WebResource = new WebResource();

  // eslint-disable-next-line no-param-reassign
  credentials = credentials ? await ext.azureAccountTreeItem.getAccountCredentials(tenantId) : credentials;
  await credentials?.signRequest(webResource);

  return webResource.headers.get('authorization') ?? webResource.headers['authorization'];
}

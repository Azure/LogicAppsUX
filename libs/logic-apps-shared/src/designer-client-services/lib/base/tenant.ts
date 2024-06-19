import { ArgumentException } from '../../../utils/src';
import { getAzureResourceRecursive, type Tenant } from '../common/azure';
import type { IHttpClient } from '../httpClient';
import type { ITenantService } from '../tenant';

export interface BaseTenantServiceOptions {
  baseUrl: string;
  httpClient: IHttpClient;
  apiVersion: string;
}

export class BaseTenantService implements ITenantService {
  constructor(public readonly options: BaseTenantServiceOptions) {
    const { baseUrl, apiVersion } = options;
    if (!baseUrl) {
      throw new ArgumentException('baseUrl required');
    }
    if (!apiVersion) {
      throw new ArgumentException('apiVersion required');
    }
  }

  dispose(): void {
    return;
  }

  async getTenants(): Promise<Tenant[]> {
    const { httpClient, apiVersion, baseUrl } = this.options;
    const uri = `${baseUrl}/tenants`;
    const queryParameters = { 'api-version': apiVersion };

    try {
      const response = await getAzureResourceRecursive(httpClient, uri, queryParameters);
      return response;
    } catch (error) {
      return [];
    }
  }
}

import type { ICognitiveServiceService } from '../cognitiveService';
import type { IHttpClient } from '../httpClient';
import type { ManagedIdentity } from '../../../utils/src';
import { ArgumentException } from '../../../utils/src';
import { fetchAppsByQuery, getAzureResourceRecursive } from '../common/azure';

export interface BaseCognitiveServiceServiceOptions {
  baseUrl: string;
  apiVersion: string;
  httpClient: IHttpClient;
  identity?: ManagedIdentity;
}

export class BaseCognitiveServiceService implements ICognitiveServiceService {
  constructor(public readonly options: BaseCognitiveServiceServiceOptions) {
    const { apiVersion, httpClient } = options;
    if (!apiVersion) {
      throw new ArgumentException('apiVersion required');
    }

    if (!httpClient) {
      throw new ArgumentException('httpClient required for workflow app');
    }
  }

  async fetchCognitiveServiceAccountById(accountId: string): Promise<any> {
    const { httpClient, baseUrl, apiVersion } = this.options;
    const uri = `${baseUrl}${accountId}`;
    try {
      const response = await httpClient.get({
        uri,
        queryParameters: {
          'api-version': apiVersion,
        },
      });
      return response;
    } catch (e: any) {
      return new Error(e?.message ?? e);
    }
  }

  async fetchCognitiveServiceAccountKeysById(accountId: string): Promise<any> {
    const { httpClient, baseUrl, apiVersion } = this.options;
    const uri = `${baseUrl}${accountId}/listKeys`;
    try {
      const response = await httpClient.post({
        uri,
        queryParameters: {
          'api-version': apiVersion,
        },
      });
      return response;
    } catch (e: any) {
      return new Error(e?.message ?? e);
    }
  }

  async fetchAllCognitiveServiceAccounts(subscriptionId: string): Promise<any> {
    const { httpClient, baseUrl } = this.options;

    const uri = `${baseUrl}/providers/Microsoft.ResourceGraph/resources?api-version=2021-03-01`;

    const response = await fetchAppsByQuery(
      httpClient,
      uri,
      `Resources
    | where type == "microsoft.cognitiveservices/accounts"
    | where kind in ("OpenAI", "AIServices")
    | order by ['name'] asc`,
      [subscriptionId]
    );

    return response;
  }

  async fetchAllCognitiveServiceAccountDeployments(accountId: string): Promise<any[]> {
    const { httpClient, baseUrl, apiVersion } = this.options;
    const uri = `${baseUrl}${accountId}/deployments`;
    const response = await getAzureResourceRecursive(httpClient, uri, {
      'api-version': apiVersion,
    });
    return response;
  }

  async fetchAllSessionPoolAccounts(subscriptionId: string): Promise<any> {
    const { httpClient, baseUrl } = this.options;

    const uri = `${baseUrl}/providers/Microsoft.ResourceGraph/resources?api-version=2021-03-01`;

    const response = await fetchAppsByQuery(
      httpClient,
      uri,
      `Resources
    | where type in~ ('Microsoft.App/sessionPools')
    | order by ['name'] asc`,
      [subscriptionId]
    );

    return response;
  }

  async fetchSessionPoolAccountById(accountId: string): Promise<any> {
    const { httpClient, baseUrl } = this.options;
    const uri = `${baseUrl}${accountId}`;

    try {
      const response = await httpClient.get({
        uri,
        queryParameters: {
          'api-version': '2024-10-02-preview',
        },
      });
      return response;
    } catch (e: any) {
      return new Error(e?.message ?? e);
    }
  }
  async fetchBuiltInRoleDefinitions(): Promise<any> {
    const { httpClient, baseUrl } = this.options;

    const uri = `${baseUrl}/providers/Microsoft.Authorization/roleDefinitions`;

    try {
      const response = await httpClient.get({
        uri,
        queryParameters: {
          'api-version': '2022-05-01-preview',
          $filter: "type eq 'BuiltInRole'",
        },
        includeAuth: true,
      });
      return response;
    } catch (e: any) {
      return new Error(e?.message ?? e);
    }
  }

  async hasRolePermission(accountId: string, roleDefinitionId: string): Promise<boolean> {
    const { httpClient, identity } = this.options;

    if (!identity?.principalId) {
      return false;
    }

    const uri = `${accountId}/providers/Microsoft.Authorization/roleAssignments`;
    const queryParameters = {
      'api-version': '2020-04-01-preview',
      $filter: `atScope() and assignedTo('${identity.principalId}')`,
    };

    try {
      const response = await httpClient.get<any>({
        uri,
        queryParameters,
        includeAuth: true,
      });

      const assignments = Array.isArray(response?.value) ? response.value : [];

      return assignments.some((assignment: any) => {
        const assignedRoleId = assignment?.properties?.roleDefinitionId;
        const match = assignedRoleId?.toLowerCase().endsWith(roleDefinitionId.toLowerCase());
        return Boolean(match);
      });
    } catch (_e: any) {
      return false;
    }
  }
  async fetchAllCognitiveServiceProjects(serviceAccountId: string): Promise<any> {
    const { httpClient, baseUrl } = this.options;
    const uri = `${baseUrl}${serviceAccountId}/projects`;

    try {
      const response = await httpClient.get({
        uri,
        queryParameters: {
          'api-version': '2025-04-01-preview',
        },
      });
      return response;
    } catch (e: any) {
      return new Error(e?.message ?? e);
    }
  }

  async createNewDeployment(deploymentName: string, model: string, openAIResourceId: string): Promise<any> {
    const { httpClient, baseUrl } = this.options;
    const uri = `${baseUrl}${openAIResourceId}/deployments/${deploymentName}`;

    try {
      const response = await httpClient.put({
        uri,
        queryParameters: {
          'api-version': '2023-10-01-preview',
        },
        content: {
          properties: {
            model: {
              name: model,
              version: '2025-04-14',
              format: 'OpenAI',
            },
            raiPolicyName: 'Microsoft.DefaultV2',
            versionUpgradeOption: 'OnceNewDefaultVersionAvailable',
          },
          sku: {
            name: 'GlobalStandard',
            capacity: 100,
          },
        },
      });
      return response;
    } catch (e: any) {
      throw new Error(e?.message ?? e);
    }
  }
}

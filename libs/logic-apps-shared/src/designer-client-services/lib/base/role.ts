import { guid, type ArmResource } from '../../../utils/src';
import { getAzureResourceRecursive } from '../common/azure';
import type { IHttpClient } from '../httpClient';
import type { IRoleService, RoleAssignment, RoleAssignmentPayload, RoleDefinition } from '../role';

const defaultApiVersion = '2022-05-01-preview';

export type BaseRoleServiceOptions = {
  httpClient: IHttpClient;
  subscriptionId: string;
  baseUrl: string;
  apiVersion: string;
  tenantId: string;
  userId: string;
  appIdentity: string;
};

export class BaseRoleService implements IRoleService {
  constructor(private options: BaseRoleServiceOptions) {}

  async fetchRoleDefinitions(resourceId: string, _queryParameters?: Record<string, string>): Promise<ArmResource<RoleDefinition>[]> {
    const { baseUrl, httpClient, apiVersion = defaultApiVersion } = this.options;
    const uri = `${baseUrl}${resourceId}/providers/Microsoft.Authorization/roleDefinitions`;
    const queryParameters = {
      'api-version': apiVersion,
      ..._queryParameters,
    };
    const response = await getAzureResourceRecursive(httpClient, uri, queryParameters);
    return response ?? [];
  }

  async fetchUserRoleAssignmentsForResource(resourceId: string): Promise<ArmResource<RoleAssignment>[]> {
    const { baseUrl, httpClient, apiVersion = defaultApiVersion, userId } = this.options;
    const uri = `${baseUrl}${resourceId}/providers/Microsoft.Authorization/roleAssignments`;
    const queryParameters = {
      'api-version': apiVersion,
      $filter: `atScope() and assignedTo('${userId}')`,
    };
    const response = await getAzureResourceRecursive(httpClient, uri, queryParameters);
    return response ?? [];
  }

  async fetchAppIdentityRoleAssignments(): Promise<ArmResource<RoleAssignment>[]> {
    const { baseUrl, subscriptionId, httpClient, apiVersion = defaultApiVersion, appIdentity } = this.options;
    const uri = `${baseUrl}/subscriptions/${subscriptionId}/providers/Microsoft.Authorization/roleAssignments`;
    const queryParameters = {
      'api-version': apiVersion,
      $filter: `assignedTo('${appIdentity}')`,
    };
    const response = await getAzureResourceRecursive(httpClient, uri, queryParameters);
    return response ?? [];
  }

  async addRoleAssignmentForApp(resourceId: string, definitionId: string): Promise<ArmResource<RoleAssignment>> {
    const { baseUrl, httpClient, apiVersion = defaultApiVersion, appIdentity } = this.options;
    const newId = guid();
    const uri = `${baseUrl}${resourceId}/providers/Microsoft.Authorization/roleAssignments/${newId}`;
    const queryParameters = {
      'api-version': apiVersion,
    };
    const response = await httpClient.put<ArmResource<RoleAssignment>, { id: string; properties: RoleAssignmentPayload }>({
      uri,
      queryParameters,
      includeAuth: true,
      content: {
        id: newId,
        properties: {
          principalId: appIdentity,
          principalType: 'ServicePrincipal',
          roleDefinitionId: definitionId,
          scope: resourceId,
        },
      },
    });
    if (!response) {
      throw new Error('Failed to create role assignment');
    }
    return response;
  }
}

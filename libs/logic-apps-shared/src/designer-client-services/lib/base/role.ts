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
  userIdentityId: string;
  appIdentityId: string;
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
    const { baseUrl, httpClient, apiVersion = defaultApiVersion, userIdentityId } = this.options;
    const uri = `${baseUrl}${resourceId}/providers/Microsoft.Authorization/roleAssignments`;
    const queryParameters = {
      'api-version': apiVersion,
      $filter: `atScope() and assignedTo('${userIdentityId}')`,
    };
    const response = await getAzureResourceRecursive(httpClient, uri, queryParameters);
    return response ?? [];
  }

  async fetchAppRoleAssignmentsForResource(resourceId: string): Promise<ArmResource<RoleAssignment>[]> {
    const { baseUrl, httpClient, apiVersion = defaultApiVersion, appIdentityId } = this.options;
    const uri = `${baseUrl}${resourceId}/providers/Microsoft.Authorization/roleAssignments`;
    const queryParameters = {
      'api-version': apiVersion,
      $filter: `atScope() and assignedTo('${appIdentityId}')`,
    };
    const response = await getAzureResourceRecursive(httpClient, uri, queryParameters);
    return response ?? [];
  }

  async addAppRoleAssignmentForResource(resourceId: string, definitionId: string): Promise<ArmResource<RoleAssignment>> {
    const { baseUrl, httpClient, apiVersion = defaultApiVersion, appIdentityId } = this.options;
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
          principalId: appIdentityId,
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

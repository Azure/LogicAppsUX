import type { ArmResource } from '../../../utils/src';
import { getAzureResourceRecursive } from '../common/azure';
import type { IHttpClient } from '../httpClient';
import type { IRoleService, RoleAssignment, RoleDefinition } from '../role';

export interface BaseRoleServiceOptions {
  httpClient: IHttpClient;
  baseUrl: string;
  apiVersion: string;
  tenantId?: string;
  objectId?: string;
}

const defaultApiVersion = '2022-05-01-preview';

export class BaseRoleService implements IRoleService {
  constructor(private options: BaseRoleServiceOptions) {}

  async getRoleDefinitions(resourceId: string, _queryParameters?: Record<string, string>): Promise<ArmResource<RoleDefinition>[]> {
    const { baseUrl, httpClient, apiVersion = defaultApiVersion } = this.options;
    const uri = `${baseUrl}${resourceId}/providers/Microsoft.Authorization/roleDefinitions`;
    const queryParameters = {
      'api-version': apiVersion,
      ..._queryParameters,
    };
    const response = await getAzureResourceRecursive(httpClient, uri, queryParameters);
    return response ?? [];
  }

  async getUserRoleAssignmentsForResource(resourceId: string): Promise<ArmResource<RoleAssignment>[]> {
    const { baseUrl, httpClient, apiVersion = defaultApiVersion, objectId } = this.options;
    const uri = `${baseUrl}${resourceId}/providers/Microsoft.Authorization/roleAssignments`;
    const queryParameters = {
      'api-version': apiVersion,
      $filter: `assignedTo('${objectId}')`,
    };
    const response = await getAzureResourceRecursive(httpClient, uri, queryParameters);
    return response ?? [];
  }

  async hasRoleAssignmentsWritePermission(resourceId: string): Promise<boolean> {
    const writeRoleDefinitions = await this.getRoleDefinitions(resourceId, {
      $filter: "hasAllPermissions('Microsoft.Authorization/roleAssignments/write')",
    });
    const UserRoleAssignments = await this.getUserRoleAssignmentsForResource(resourceId);
    for (const roleDefinition of writeRoleDefinitions) {
      if (UserRoleAssignments.some((assignment) => assignment.properties.roleDefinitionId === roleDefinition.id)) {
        return true;
      }
    }
    return false;
  }
}

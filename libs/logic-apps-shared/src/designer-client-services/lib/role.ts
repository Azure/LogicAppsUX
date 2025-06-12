import type { ArmResource } from '../../utils/src';
import { AssertionErrorCode, AssertionException } from '../../utils/src';

export type RoleDefinition = {
  roleName: string;
  type: string;
  description: string;
  assignableScopes: string[];
  permissions: {
    actions?: string[];
    notActions?: string[];
    dataActions?: string[];
    notDataActions?: string[];
  }[];
  createdOn: string;
  updatedOn: string;
  createdBy: string;
  updatedBy: string;
};

export type RoleAssignment = {
  roleDefinitionId: string;
  principalId: string;
  principalType: string;
  scope: string;
  condition: string;
  conditionVersion: string;
  createdOn: string;
  updatedOn: string;
  createdBy: string;
  updatedBy: string;
  delegatedManagedIdentityResourceId: string;
  description: string;
};

export interface IRoleService {
  getRoleDefinitions: (resourceId: string, queryParameters?: Record<string, string>) => Promise<ArmResource<RoleDefinition>[]>;
  getUserRoleAssignmentsForResource: (resourceId: string) => Promise<ArmResource<RoleAssignment>[]>;
  hasRoleAssignmentsWritePermission: (resourceId: string) => Promise<boolean>;
}

let service: IRoleService;

export const InitRoleService = (_service: IRoleService): void => {
  service = _service;
};

export const RoleService = (): IRoleService => {
  if (!service) {
    throw new AssertionException(AssertionErrorCode.SERVICE_NOT_INITIALIZED, 'Role Service needs to be initialized before using');
  }

  return service;
};

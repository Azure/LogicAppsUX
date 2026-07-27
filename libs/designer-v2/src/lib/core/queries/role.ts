import type { ArmResource, RoleAssignment, RoleDefinition } from '@microsoft/logic-apps-shared';
import { equals, isUndefinedOrEmptyString, RoleService } from '@microsoft/logic-apps-shared';
import { useQuery } from '@tanstack/react-query';
import { getReactQueryClient } from '../ReactQueryProvider';

const queryOpts = {
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
};

export const roleQueryKeys = {
  roleDefinitions: 'roleDefinitions',
  userRoleAssignments: 'userRoleAssignments',
  appIdentityRoleAssignments: 'appIdentityRoleAssignments',
};

export const useResourceRoleDefinitionsQuery = (resourceId: string) =>
  useQuery<ArmResource<RoleDefinition>[]>(resourceRoleDefinitionQueryOpts(resourceId));
const resourceRoleDefinitionQueryOpts = (resourceId: string) => ({
  queryKey: [roleQueryKeys.roleDefinitions, resourceId],
  queryFn: async () => RoleService().fetchRoleDefinitions(resourceId),
  enabled: !isUndefinedOrEmptyString(resourceId),
  ...queryOpts,
});

export const useUserRoleAssignmentsForResourceQuery = (resourceId: string) =>
  useQuery<ArmResource<RoleAssignment>[]>(userRoleAssignmentsQueryOpts(resourceId));
const userRoleAssignmentsQueryOpts = (resourceId: string) => ({
  queryKey: [roleQueryKeys.userRoleAssignments, resourceId],
  queryFn: () => RoleService().fetchUserRoleAssignmentsForResource(resourceId),
  enabled: !isUndefinedOrEmptyString(resourceId),
  ...queryOpts,
});

export const useAppIdentityRoleAssignmentsForResourceQuery = (resourceId: string) =>
  useQuery<ArmResource<RoleAssignment>[]>(appIdentityRoleAssignmentsQueryOpts(resourceId));
const appIdentityRoleAssignmentsQueryOpts = (resourceId: string) => ({
  queryKey: [roleQueryKeys.appIdentityRoleAssignments, resourceId],
  queryFn: () => RoleService().fetchAppRoleAssignmentsForResource(resourceId),
  enabled: !isUndefinedOrEmptyString(resourceId),
  ...queryOpts,
});

export const useHasRoleAssignmentsWritePermissionQuery = (resourceId: string, _enabled = true) => {
  return useQuery<boolean>(
    [roleQueryKeys.userRoleAssignments, resourceId, 'hasWritePermission'],
    async () => {
      const queryClient = getReactQueryClient();
      const writeRoleDefinitions = await RoleService().fetchRoleDefinitions(resourceId, {
        $filter: "hasAllPermissions('Microsoft.Authorization/roleAssignments/write')",
      });
      const userRoleAssignments: ArmResource<RoleAssignment>[] =
        (await queryClient.fetchQuery(userRoleAssignmentsQueryOpts(resourceId))) ?? [];
      for (const roleDefinition of writeRoleDefinitions) {
        if (userRoleAssignments.some((assignment) => assignment.properties.roleDefinitionId === roleDefinition.id)) {
          return true;
        }
      }
      return false;
    },
    {
      enabled: _enabled && !isUndefinedOrEmptyString(resourceId),
      ...queryOpts,
    }
  );
};

export const useRoleDefinitionsByIdQuery = (definitionIds: string[]) =>
  useQuery<Record<string, ArmResource<RoleDefinition>>>(roleDefinitionByIdQueryOpts(definitionIds));
const roleDefinitionByIdQueryOpts = (definitionIds: string[]) => ({
  queryKey: [roleQueryKeys.roleDefinitions, 'byId', definitionIds],
  queryFn: async () => {
    const builtInRoles = await RoleService().fetchRoleDefinitions('', { $filter: "type eq 'BuiltInRole'" });
    const output: Record<string, ArmResource<RoleDefinition>> = {};
    for (const definitionId of definitionIds) {
      // ARM returns the role definition GUID as the resource `name`.
      const roleDefinition = builtInRoles.find((role) => equals(role.name, definitionId));
      if (roleDefinition) {
        output[definitionId] = roleDefinition;
      }
    }
    return output;
  },
  enabled: definitionIds.length > 0,
  ...queryOpts,
});

export const useHasRequiredRoleDefinitionsQuery = (resourceId: string, definitionIds: string[], _enabled = true) => {
  return useQuery<boolean>(
    [roleQueryKeys.roleDefinitions, 'userHasById', resourceId, definitionIds],
    async () => {
      const missingDefinitions = await getMissingRoleDefinitions(resourceId, definitionIds);
      return missingDefinitions.length === 0;
    },
    {
      enabled: _enabled && !!resourceId,
      ...queryOpts,
    }
  );
};

/**
 * Returns the role definitions from `definitionIds` that are not yet assigned to the app identity at `resourceId`.
 *
 * Roles are looked up by role definition ID rather than display name: Azure renamed the Foundry built-in roles
 * (for example "Azure AI User" -> "Foundry User") without changing their IDs, so name-based lookups silently
 * resolve to nothing once the rename reaches a tenant.
 */
export const getMissingRoleDefinitions = async (resourceId: string, definitionIds: string[]): Promise<ArmResource<RoleDefinition>[]> => {
  if (!resourceId || definitionIds.length === 0) {
    return [];
  }

  const queryClient = getReactQueryClient();
  const assignments: ArmResource<RoleAssignment>[] = (await queryClient.fetchQuery(appIdentityRoleAssignmentsQueryOpts(resourceId))) ?? [];
  const definitions: Record<string, ArmResource<RoleDefinition>> = (await queryClient.fetchQuery(
    roleDefinitionByIdQueryOpts(definitionIds)
  )) ?? {};

  if (Object.keys(definitions).length === 0) {
    return []; // No definitions found
  }

  if (assignments.length === 0) {
    return Object.values(definitions); // No assignments found, return all definitions
  }

  const missingDefinitions: ArmResource<RoleDefinition>[] = [];
  for (const definitionId of definitionIds) {
    const definition = definitions[definitionId];
    if (!definition) {
      continue; // Role definition does not exist in this environment, nothing to assign
    }
    if (
      !assignments.some(
        (assignment) => assignment?.properties?.roleDefinitionId?.endsWith(definition.id) && assignment.properties.scope === resourceId
      )
    ) {
      missingDefinitions.push(definition);
    }
  }
  return missingDefinitions;
};

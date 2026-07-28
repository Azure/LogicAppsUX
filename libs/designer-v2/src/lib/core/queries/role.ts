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
      const rolesToAssign = await getRoleDefinitionsToAssign(resourceId, definitionIds);
      return rolesToAssign.length === 0;
    },
    {
      enabled: _enabled && !!resourceId,
      ...queryOpts,
    }
  );
};

/**
 * Resolves the role definitions that still need to be assigned to the app identity at `resourceId`.
 *
 * `preferredDefinitionIds` is a **preference-ordered list of alternatives, not a set of roles that are
 * all required** — the identity only needs one of them. The first entry that exists in the tenant wins.
 *
 * Returns an empty array when:
 * - the identity already holds any one of the alternatives, or
 * - none of them exist in this cloud (for example the Foundry roles in a sovereign or air-gapped
 *   cloud), in which case there is nothing we can assign and the caller should not block on it.
 *
 * Roles are looked up by role definition ID rather than display name: Azure renamed the Foundry
 * built-in roles (for example "Azure AI User" -> "Foundry User") without changing their IDs, so
 * name-based lookups silently resolve to nothing once the rename reaches a tenant.
 */
export const getRoleDefinitionsToAssign = async (
  resourceId: string,
  preferredDefinitionIds: string[]
): Promise<ArmResource<RoleDefinition>[]> => {
  if (!resourceId || preferredDefinitionIds.length === 0) {
    return [];
  }

  const queryClient = getReactQueryClient();
  const assignments: ArmResource<RoleAssignment>[] = (await queryClient.fetchQuery(appIdentityRoleAssignmentsQueryOpts(resourceId))) ?? [];
  const definitions: Record<string, ArmResource<RoleDefinition>> = (await queryClient.fetchQuery(
    roleDefinitionByIdQueryOpts(preferredDefinitionIds)
  )) ?? {};

  // Keep caller-supplied preference order, dropping any role that does not exist in this cloud.
  const availableDefinitions = preferredDefinitionIds
    .map((definitionId) => definitions[definitionId])
    .filter((definition): definition is ArmResource<RoleDefinition> => !!definition);

  if (availableDefinitions.length === 0) {
    return [];
  }

  const isAssignedAtScope = (definition: ArmResource<RoleDefinition>) =>
    assignments.some(
      (assignment) => assignment?.properties?.roleDefinitionId?.endsWith(definition.id) && assignment.properties.scope === resourceId
    );

  if (availableDefinitions.some(isAssignedAtScope)) {
    return [];
  }

  return [availableDefinitions[0]];
};

import type { ArmResource, RoleAssignment, RoleDefinition } from '@microsoft/logic-apps-shared';
import { isUndefinedOrEmptyString, RoleService } from '@microsoft/logic-apps-shared';
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
  queryFn: () => RoleService().fetchAppIdentityRoleAssignments(),
  enabled: !isUndefinedOrEmptyString(resourceId),
  select: (data: ArmResource<RoleAssignment>[]) => data.filter((assignment) => assignment.properties.scope === resourceId),
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

export const useRoleDefinitionsByNameQuery = (definitionNames: string[]) =>
  useQuery<Record<string, ArmResource<RoleDefinition>>>(roleDefinitionByNameQueryOpts(definitionNames));
const roleDefinitionByNameQueryOpts = (definitionNames: string[]) => ({
  queryKey: [roleQueryKeys.roleDefinitions, 'byName', definitionNames],
  queryFn: async () => {
    const builtInRoles = await RoleService().fetchRoleDefinitions('', { $filter: "type eq 'BuiltInRole'" });
    const output: Record<string, ArmResource<RoleDefinition>> = {};
    for (const name of definitionNames) {
      const roleDefinition = builtInRoles.find((role) => role.properties.roleName === name);
      if (roleDefinition) {
        output[name] = roleDefinition;
      }
    }
    return output;
  },
  enabled: definitionNames.length > 0,
  ...queryOpts,
});

export const useHasRoleDefinitionsByNameQuery = (resourceId: string, definitionNames: string[], _enabled = true) => {
  return useQuery<boolean>(
    [roleQueryKeys.roleDefinitions, 'userHasByName', resourceId, definitionNames],
    async () => {
      const missingDefinitions = await getMissingRoleDefinitions(resourceId, definitionNames);
      return missingDefinitions.length === 0;
    },
    {
      enabled: _enabled && !!resourceId,
      ...queryOpts,
    }
  );
};

export const getMissingRoleDefinitions = async (resourceId: string, definitionNames: string[]): Promise<ArmResource<RoleDefinition>[]> => {
  if (!resourceId || definitionNames.length === 0) {
    return [];
  }

  const queryClient = getReactQueryClient();
  const assignments: ArmResource<RoleAssignment>[] = (await queryClient.fetchQuery(appIdentityRoleAssignmentsQueryOpts(resourceId))) ?? [];
  const definitions: Record<string, ArmResource<RoleDefinition>> = (await queryClient.fetchQuery(
    roleDefinitionByNameQueryOpts(definitionNames)
  )) ?? {};

  if (Object.keys(definitions).length === 0) {
    return []; // No definitions found
  }

  if (assignments.length === 0) {
    return Object.values(definitions); // No assignments found, return all definitions
  }

  const missingDefinitions: ArmResource<RoleDefinition>[] = [];
  for (const name of definitionNames) {
    if (
      !assignments.some(
        (assignment) =>
          assignment?.properties?.roleDefinitionId.endsWith(definitions[name].id) && assignment.properties.scope === resourceId
      )
    ) {
      missingDefinitions.push(definitions[name]);
    }
  }
  return missingDefinitions;
};

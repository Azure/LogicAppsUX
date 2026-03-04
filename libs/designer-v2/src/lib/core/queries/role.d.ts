import type { ArmResource, RoleAssignment, RoleDefinition } from '@microsoft/logic-apps-shared';
export declare const roleQueryKeys: {
    roleDefinitions: string;
    userRoleAssignments: string;
    appIdentityRoleAssignments: string;
};
export declare const useResourceRoleDefinitionsQuery: (resourceId: string) => import("@tanstack/react-query").UseQueryResult<ArmResource<RoleDefinition>[], unknown>;
export declare const useUserRoleAssignmentsForResourceQuery: (resourceId: string) => import("@tanstack/react-query").UseQueryResult<ArmResource<RoleAssignment>[], unknown>;
export declare const useAppIdentityRoleAssignmentsForResourceQuery: (resourceId: string) => import("@tanstack/react-query").UseQueryResult<ArmResource<RoleAssignment>[], unknown>;
export declare const useHasRoleAssignmentsWritePermissionQuery: (resourceId: string, _enabled?: boolean) => import("@tanstack/react-query").UseQueryResult<boolean, unknown>;
export declare const useRoleDefinitionsByNameQuery: (definitionNames: string[]) => import("@tanstack/react-query").UseQueryResult<Record<string, ArmResource<RoleDefinition>>, unknown>;
export declare const useHasRoleDefinitionsByNameQuery: (resourceId: string, definitionNames: string[], _enabled?: boolean) => import("@tanstack/react-query").UseQueryResult<boolean, unknown>;
export declare const getMissingRoleDefinitions: (resourceId: string, definitionNames: string[]) => Promise<ArmResource<RoleDefinition>[]>;

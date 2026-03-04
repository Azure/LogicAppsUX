import type { Connection } from '@microsoft/logic-apps-shared';
export declare const queryKeys: {
    allCognitiveServiceAccounts: string;
    allCognitiveServiceAccountsDeployments: string;
    allSessionPoolAccounts: string;
    allBuiltInRoleDefinitions: string;
    allAPIMServiceAccounts: string;
    allAPIMServiceAccountApis: string;
};
export declare const useAllAPIMServiceAccounts: (subscriptionId: string, enabled?: boolean) => import("@tanstack/react-query").UseQueryResult<any, unknown>;
export declare const useAllAPIMServiceAccountsApis: (accountId: string, enabled?: boolean) => import("@tanstack/react-query").UseQueryResult<any, unknown>;
export declare const useAllCognitiveServiceAccounts: (subscriptionId: string, enabled?: boolean) => import("@tanstack/react-query").UseQueryResult<any, unknown>;
export declare const getCognitiveServiceAccountDeploymentsForConnection: (connection: Connection) => Promise<any>;
export declare const useCognitiveServiceAccountId: (nodeId: string, _connectorId?: string) => string | undefined;
export declare const useCognitiveServiceAccountDeploymentsForNode: (nodeId: string, connectorId?: string) => import("@tanstack/react-query").UseQueryResult<any, unknown>;
export declare const useAllCognitiveServiceProjects: (subscriptionId: string, enabled?: boolean) => import("@tanstack/react-query").UseQueryResult<any, unknown>;
export declare const useAllSessionPoolAccounts: (subscriptionId: string) => import("@tanstack/react-query").UseQueryResult<any, unknown>;
export declare const useAllBuiltInRoleDefinitions: () => import("@tanstack/react-query").UseQueryResult<any, unknown>;

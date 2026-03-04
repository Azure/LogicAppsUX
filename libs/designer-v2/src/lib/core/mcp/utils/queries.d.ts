import { type LogicAppResource } from '@microsoft/logic-apps-shared';
import { type UseQueryResult } from '@tanstack/react-query';
export declare const useAllManagedConnectors: () => {
    data: import("@microsoft/logic-apps-shared").Connector[];
    isLoading: boolean;
    hasNextPage: boolean | undefined;
};
export declare const useOperationsByConnectorQuery: (connectorId: string) => UseQueryResult<import("@microsoft/logic-apps-shared").DiscoveryOperation<import("@microsoft/logic-apps-shared").DiscoveryResultTypes>[], unknown>;
export declare const useEmptyLogicApps: (subscriptionId: string) => UseQueryResult<LogicAppResource[], unknown>;
export declare const resetQueriesOnRegisterMcpServer: (subscriptionId: string, resourceGroup: string, logicAppName: string) => void;

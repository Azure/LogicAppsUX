import type { ConnectionMapping, ConnectionReference, ConnectionReferences } from '../../../common/models/workflow';
import { type Gateway, type Connector } from '@microsoft/logic-apps-shared';
import type { UseQueryResult } from '@tanstack/react-query';
import type { ConnectionsStoreState } from './connectionSlice';
export declare const useConnector: (connectorId?: string, enabled?: boolean, useCachedData?: boolean) => UseQueryResult<Connector | undefined, unknown>;
export declare const useConnectors: (connectorIds?: string[]) => UseQueryResult<Connector[] | null, unknown>;
export declare const useSwagger: (connectorId?: string, enabled?: boolean) => UseQueryResult<import("@microsoft/logic-apps-shared/src/utils/src/lib/models/openApiV2").Document, unknown>;
export declare const useGateways: (subscriptionId: string, connectorName: string) => UseQueryResult<Gateway[], unknown>;
export declare const useSubscriptions: () => UseQueryResult<import("@microsoft/logic-apps-shared").Subscription[] | undefined, unknown>;
export declare const useGatewayServiceConfig: () => import("@microsoft/logic-apps-shared").GatewayServiceConfig;
export declare const useTenants: () => UseQueryResult<import("@microsoft/logic-apps-shared").Tenant[] | undefined, unknown>;
export declare const useConnectorByNodeId: (nodeId: string) => Connector | undefined;
export declare const useNodeConnectionId: (nodeId: string) => string;
export declare const useConnectionMapping: () => ConnectionMapping;
export declare const useConnectionRefs: () => ConnectionReferences;
export declare const useConnectionRefsByConnectorId: (connectorId?: string) => ConnectionReference[];
export declare const useIsOperationMissingConnection: (nodeId: string) => boolean;
export declare const useShowIdentitySelectorQuery: (nodeId: string) => {
    isLoading: boolean;
    result: boolean | undefined;
};
export declare const getConnectionReferenceForNodeId: (connectionState: ConnectionsStoreState, nodeId: string) => {
    connectionReference: ConnectionReference;
    referenceKey: string;
} | undefined;
export declare const useSelectedConnection: (nodeId: string) => import("@microsoft/logic-apps-shared").Connection | undefined;

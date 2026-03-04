import { SwaggerParser } from '@microsoft/logic-apps-shared';
import type { Connection, Connector } from '@microsoft/logic-apps-shared';
import type { UseQueryResult } from '@tanstack/react-query';
export interface ConnectorWithParsedSwagger {
    connector: Connector;
    parsedSwagger: SwaggerParser;
}
export declare const clearConnectionCaches: () => void;
export declare const updateNewConnectionInQueryCache: (connectorId: string, connection: Connection) => Promise<void>;
export declare const getConnectorWithSwagger: (connectorId: string) => Promise<ConnectorWithParsedSwagger>;
export declare const getSwaggerForConnector: (connectorId: string) => Promise<SwaggerParser>;
export declare const getSwaggerFromEndpoint: (uri: string) => Promise<SwaggerParser>;
export declare const getConnectionsQuery: () => Promise<void>;
export declare const useConnectionById: (connectionId: string, connectorId: string) => {
    isLoading: boolean;
    result: Connection | undefined;
};
export declare const useAllConnections: () => UseQueryResult<Connection[], unknown>;
export declare const useConnectionsForConnector: (connectorId: string, shouldNotRefetch?: boolean) => UseQueryResult<Connection[], unknown>;
export declare const getConnectionsForConnector: (connectorId: string) => Promise<Connection[]>;
export declare const getConnection: (_connectionId: string, _connectorId: string, fetchResourceIfNeeded?: boolean) => Promise<Connection | null>;
export declare const getUniqueConnectionName: (connectorId: string, existingKeys?: string[]) => Promise<string>;
export declare const useConnectionResource: (_connectionId: string) => UseQueryResult<Connection, unknown>;

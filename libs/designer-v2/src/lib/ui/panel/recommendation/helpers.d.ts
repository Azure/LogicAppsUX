import type { OperationActionData, OperationGroupCardData } from '@microsoft/designer-ui';
import type { BuiltInOperation, Connection, Connector, DiscoveryOperation, DiscoveryResultTypes, OperationApi } from '@microsoft/logic-apps-shared';
export declare const MCP_CLIENT_CONNECTOR_ID = "connectionProviders/mcpclient";
export declare const builtinMcpServerOperation: DiscoveryOperation<BuiltInOperation>;
export declare const getOperationGroupCardDataFromConnector: (connector: Connector | OperationApi) => OperationGroupCardData;
export declare const connectionToOperation: (connection: Connection) => DiscoveryOperation<DiscoveryResultTypes>;
export declare const getOperationCardDataFromOperation: (operation: DiscoveryOperation<DiscoveryResultTypes>) => OperationActionData;
export declare const ALLOWED_A2A_CONNECTOR_NAMES: Set<string>;
export declare const getNodeId: (operation: DiscoveryOperation<DiscoveryResultTypes> | undefined) => string;

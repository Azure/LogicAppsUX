import type { Connector, LogicAppsV2, OpenAPIV2, OperationInfo, OperationManifest } from '@microsoft/logic-apps-shared';
export declare const getOperationInfo: (nodeId: string, operation: LogicAppsV2.ActionDefinition | LogicAppsV2.TriggerDefinition, isTrigger: boolean) => Promise<OperationInfo>;
export declare const getConnector: (connectorId: string, useCachedData?: boolean) => Promise<Connector>;
export declare const getSwagger: (connectorId: string) => Promise<OpenAPIV2.Document>;
export declare const getOperation: ({ connectorId, operationId }: OperationInfo, useCachedData?: boolean) => Promise<any>;
export declare const getOperationManifest: ({ connectorId, operationId }: OperationInfo) => Promise<OperationManifest>;

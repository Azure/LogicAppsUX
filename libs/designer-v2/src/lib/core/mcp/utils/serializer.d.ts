import { type ConnectionsData, type LogicAppsV2 } from '@microsoft/logic-apps-shared';
import type { OperationMetadataState } from '../../state/operation/operationMetadataSlice';
import type { ConnectionsStoreState } from '../../state/connection/connectionSlice';
export interface McpServerCreateData {
    logicAppId: string;
    serverInfo: {
        displayName: string;
        description: string;
    };
    workflows: Record<string, {
        definition: LogicAppsV2.WorkflowDefinition;
        kind: string;
    }>;
    connectionsData: ConnectionsData | undefined;
}
export declare const serializeMcpWorkflows: ({ subscriptionId, resourceGroup, logicAppName }: {
    subscriptionId: string;
    resourceGroup: string;
    logicAppName: string;
}, connectionState: ConnectionsStoreState, operationsState: OperationMetadataState) => Promise<McpServerCreateData>;
export declare const getWorkflowNameFromOperation: (operationSummary: string | undefined, operationId: string) => string;

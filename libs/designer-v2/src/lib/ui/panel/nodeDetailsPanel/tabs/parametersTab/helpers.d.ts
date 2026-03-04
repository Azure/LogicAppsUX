import type { Connection, ParameterInfo } from '@microsoft/logic-apps-shared';
import type { ParameterGroup } from '../../../../../core/state/operation/operationMetadataSlice';
import type { RootState } from '../../../../../core';
interface CategorizedConnections {
    azureOpenAI: Connection[];
    foundry: Connection[];
}
export declare const agentModelTypeParameterKey = "inputs.$.agentModelType";
export declare const isAgentConnectorAndDeploymentId: (id: string, key: string) => boolean;
export declare const isAgentConnectorAndAgentModel: (id: string, key: string) => boolean;
export declare const isAgentConnectorAndAgentServiceModel: (connectorId: string, groupId: string, parameterGroups: Record<string, ParameterGroup>) => boolean;
export declare const categorizeConnections: (connections: Connection[]) => CategorizedConnections;
export declare const getFirstDeploymentModelName: (connection: Connection) => Promise<string>;
export declare const getDeploymentIdParameter: (state: RootState, nodeId: string) => ParameterInfo | undefined;
export declare const getConnectionToAssign: (modelType: string, azureOpenAIConnections: Connection[], foundryConnections: Connection[]) => Connection | null;
export {};

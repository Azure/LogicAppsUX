import type { CustomCodeFileNameMapping } from '../../..';
import type { ConnectionReferences, WorkflowParameter } from '../../../common/models/workflow';
import type { DeserializedWorkflow } from '../../parsers/BJSWorkflow/BJSDeserializer';
import type { DependencyInfo, NodeData, NodeInputs, NodeOperation, NodeOutputs } from '../../state/operation/operationMetadataSlice';
import type { NodeTokens } from '../../state/tokens/tokensSlice';
import type { WorkflowKind } from '../../state/workflow/workflowInterfaces';
import type { RootState } from '../../store';
import type { PasteScopeParams } from './copypaste';
import type { InputParameter, OutputParameter, LogicAppsV2, OperationManifest } from '@microsoft/logic-apps-shared';
import type { Dispatch } from '@reduxjs/toolkit';
export interface NodeDataWithOperationMetadata extends NodeData {
    manifest?: OperationManifest;
    operationInfo?: NodeOperation;
}
export interface NodeInputsWithDependencies {
    inputs: NodeInputs;
    dependencies: Record<string, DependencyInfo>;
    dynamicInput?: InputParameter;
}
export interface NodeOutputsWithDependencies {
    outputs: NodeOutputs;
    dependencies: Record<string, DependencyInfo>;
    dynamicOutput?: OutputParameter;
}
export interface OperationMetadata {
    iconUri: string;
    brandColor: string;
}
export interface PasteScopeAdditionalParams extends PasteScopeParams {
    existingOutputTokens: Record<string, NodeTokens>;
    rootTriggerId: string;
}
export declare const initializeOperationMetadata: (deserializedWorkflow: DeserializedWorkflow, references: ConnectionReferences, workflowParameters: Record<string, WorkflowParameter>, customCode: CustomCodeFileNameMapping, workflowKind: WorkflowKind, dispatch: Dispatch, pasteParams?: PasteScopeAdditionalParams) => Promise<void>;
export declare const initializeOperationDetailsForManagedMcpServer: (nodeId: string, operation: LogicAppsV2.ActionDefinition | LogicAppsV2.TriggerDefinition, references: ConnectionReferences, workflowKind: WorkflowKind, dispatch: Dispatch) => Promise<NodeDataWithOperationMetadata[] | undefined>;
export declare const initializeOperationDetailsForManifest: (nodeId: string, _operation: LogicAppsV2.ActionDefinition | LogicAppsV2.TriggerDefinition, customCode: CustomCodeFileNameMapping, isTrigger: boolean, workflowKind: WorkflowKind, dispatch: Dispatch) => Promise<NodeDataWithOperationMetadata[] | undefined>;
export declare const initializeDynamicDataInNodes: (getState: () => RootState, dispatch: Dispatch, operationsToInitialize?: string[]) => Promise<void>;

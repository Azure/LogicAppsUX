import type { ConnectionReferences } from '../../../common/models/workflow';
import type { NodeDataWithOperationMetadata, NodeInputsWithDependencies, NodeOutputsWithDependencies } from '../../actions/bjsworkflow/operationdeserializer';
import type { NodeInputs, NodeOperation } from '../../state/operation/operationMetadataSlice';
import type { WorkflowKind } from '../../state/workflow/workflowInterfaces';
import type { LogicAppsV2, OperationInfo, SwaggerParser } from '@microsoft/logic-apps-shared';
import type { Dispatch } from '@reduxjs/toolkit';
interface OperationInputInfo {
    method: string;
    path?: string;
    pathTemplate?: {
        template: string;
        parameters: Record<string, string>;
    };
}
export declare const initializeOperationDetailsForSwagger: (nodeId: string, operation: LogicAppsV2.ActionDefinition | LogicAppsV2.TriggerDefinition, references: ConnectionReferences, isTrigger: boolean, workflowKind: WorkflowKind, dispatch: Dispatch) => Promise<NodeDataWithOperationMetadata[] | undefined>;
export declare const getInputParametersFromSwagger: (_nodeId: string, isTrigger: boolean, swagger: SwaggerParser, operationInfo: NodeOperation, stepDefinition?: any, loadDefaultValues?: boolean) => NodeInputsWithDependencies;
export declare const getOutputParametersFromSwagger: (isTrigger: boolean, swagger: SwaggerParser, operationInfo: NodeOperation, nodeInputs: NodeInputs, splitOnValue?: string) => NodeOutputsWithDependencies;
export declare const getOperationInfo: (nodeId: string, operation: LogicAppsV2.ApiConnectionAction, references: ConnectionReferences, connectorId?: string) => Promise<OperationInfo>;
export declare const getOperationIdFromDefinition: (operationInputInfo: OperationInputInfo, swagger: SwaggerParser) => string | undefined;
export declare function extractPathFromUri(baseUri: string, path: string): string;
export {};

import type { Workflow } from '../../../common/models/workflow';
import type { WorkflowNode } from '../../parsers/models/workflowNode';
import type { NodeOperation, NodeOutputs } from '../../state/operation/operationMetadataSlice';
import type { RootState } from '../../store';
import type { Settings } from './settings';
import type { NodeStaticResults } from './staticresults';
import type { ParameterInfo } from '@microsoft/designer-ui';
import type { LogicAppsV2, UnitTestDefinition } from '@microsoft/logic-apps-shared';
export interface SerializeOptions {
    skipValidation: boolean;
    ignoreNonCriticalErrors?: boolean;
}
export declare const serializeWorkflow: (rootState: RootState, options?: SerializeOptions) => Promise<Workflow>;
export declare const parseWorkflowParameterValue: (parameterType: any, parameterValue: any) => any;
export declare const serializeOperation: (rootState: RootState, operationId: string, _options?: SerializeOptions) => Promise<LogicAppsV2.OperationDefinition | null>;
export declare const serializeAgentConnectorOperation: (rootState: RootState, operationId: string) => Promise<LogicAppsV2.OperationDefinition>;
export interface SerializedParameter extends ParameterInfo {
    value: any;
}
export declare const getOperationInputsToSerialize: (rootState: RootState, operationId: string) => SerializedParameter[];
export declare const constructInputValues: (key: string, inputs: SerializedParameter[], encodePathComponents: boolean) => any;
export declare const serializeParametersFromSwagger: (inputs: SerializedParameter[], operationInfo: NodeOperation) => Promise<Record<string, any>>;
export declare const isWorkflowOperationNode: (node: WorkflowNode) => boolean;
export declare const serializeSettings: (settings: Settings, nodeStaticResults: NodeStaticResults, isTrigger: boolean, originalDefinition?: LogicAppsV2.OperationDefinition) => Partial<LogicAppsV2.Action | LogicAppsV2.Trigger>;
export declare const getRetryPolicy: (settings: Settings) => LogicAppsV2.RetryPolicy | undefined;
/**
 * Serializes the unit test definition based on the provided root state.
 * @param {RootState} rootState The root state object containing the unit test data.
 * @returns A promise that resolves to the serialized unit test definition.
 */
export declare const serializeUnitTestDefinition: (rootState: RootState) => Promise<UnitTestDefinition>;
/**
 * Gets the node output operations based on the provided root state.
 * @param {RootState} rootState The root state object containing the current designer state.
 * @returns A promise that resolves to the serialized unit test definition.
 */
export declare const getNodeOutputOperations: (state: RootState) => {
    operationInfo: Record<string, NodeOperation>;
    outputParameters: Record<string, NodeOutputs>;
};

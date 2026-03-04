import type { CustomCodeFileNameMapping } from '../../..';
import type { ConnectionReferences, WorkflowParameter } from '../../../common/models/workflow';
import type { DependencyInfo, NodeInputs, NodeOperation } from '../../state/operation/operationMetadataSlice';
import type { RootState } from '../../store';
import type { NodeInputsWithDependencies, NodeOutputsWithDependencies } from './operationdeserializer';
import type { Settings } from './settings';
import type { IConnectionService, IOperationManifestService, ISearchService, IOAuthService, IWorkflowService, InputParameter, OperationManifest, OperationManifestProperties, SwaggerParser } from '@microsoft/logic-apps-shared';
import type { ParameterInfo } from '@microsoft/designer-ui';
import type { Dispatch } from '@reduxjs/toolkit';
export interface ServiceOptions {
    connectionService: IConnectionService;
    operationManifestService: IOperationManifestService;
    searchService: ISearchService;
    oAuthService: IOAuthService;
    workflowService: IWorkflowService;
}
export declare const updateWorkflowParameters: (parameters: Record<string, WorkflowParameter>, dispatch: Dispatch) => void;
export declare const getInputParametersFromManifest: (_nodeId: string, operationInfo: NodeOperation, manifest: OperationManifest, presetParameterValues?: Record<string, any>, customSwagger?: SwaggerParser, stepDefinition?: any) => NodeInputsWithDependencies;
export declare const getSupportedChannelsFromManifest: (_nodeId: string, operationInfo: NodeOperation, manifest: OperationManifest) => import("@microsoft/logic-apps-shared").SupportedChannels[];
export declare const getOutputParametersFromManifest: (nodeId: string, manifest: OperationManifest, isTrigger: boolean, inputs: NodeInputs, operationInfo: NodeOperation, dispatch: Dispatch, splitOnValue?: string) => NodeOutputsWithDependencies;
export declare const updateOutputsAndTokens: (nodeId: string, operationInfo: NodeOperation, dispatch: Dispatch, isTrigger: boolean, inputs: NodeInputs, settings: Settings, shouldProcessSettings?: boolean) => Promise<void>;
export declare const getInputDependencies: (nodeInputs: NodeInputs, allInputs: InputParameter[], supportsLegacyExtension: boolean, swagger?: SwaggerParser) => Record<string, DependencyInfo>;
export declare const updateCallbackUrl: (rootState: RootState, dispatch: Dispatch) => Promise<void>;
export declare const updateCallbackUrlInInputs: (nodeId: string, { type, kind }: NodeOperation, nodeInputs: NodeInputs) => Promise<ParameterInfo | undefined>;
export declare const updateAgentUrlInInputs: ({ type, kind }: NodeOperation, nodeInputs: NodeInputs) => Promise<ParameterInfo | undefined>;
export declare const initializeCustomCodeDataInInputs: (parameter: ParameterInfo, nodeId: string, dispatch: Dispatch) => void;
export declare const updateCustomCodeInInputs: (parameter: ParameterInfo, customCode: CustomCodeFileNameMapping) => Promise<void>;
export declare const updateAllUpstreamNodes: (state: RootState, dispatch: Dispatch) => void;
export declare const getCustomSwaggerIfNeeded: (manifestProperties: OperationManifestProperties, stepDefinition?: any) => Promise<SwaggerParser | undefined>;
export declare const updateInvokerSettings: (isTrigger: boolean, triggerNodeManifest: OperationManifest | undefined, settings: Settings, updateNodeSettingsCallback: (invokerSettings: Settings) => void, references?: ConnectionReferences) => void;
export declare const initializeDiscoveryPanelFavoriteOperations: (dispatch: Dispatch) => Promise<void>;
export declare const updateParameterConditionalVisibilityAndRefreshOutputs: import("@reduxjs/toolkit").AsyncThunk<void, {
    nodeId: string;
    groupId: string;
    parameterId: string;
    value: boolean;
    operationInfo: NodeOperation;
    isTrigger: boolean;
}, {
    state?: unknown;
    dispatch?: Dispatch<import("@reduxjs/toolkit").AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;

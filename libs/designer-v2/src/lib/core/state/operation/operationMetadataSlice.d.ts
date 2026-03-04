import type { Settings } from '../../actions/bjsworkflow/settings';
import type { NodeStaticResults } from '../../actions/bjsworkflow/staticresults';
import type { RepetitionContext } from '../../utils/parameters/helper';
import type { ParameterInfo } from '@microsoft/designer-ui';
import type { FilePickerInfo, InputParameter, OutputParameter, OpenAPIV2, OperationInfo, SupportedChannels } from '@microsoft/logic-apps-shared';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { WritableDraft } from 'immer/dist/internal';
export interface ParameterGroup {
    id: string;
    description?: string;
    parameters: ParameterInfo[];
    rawInputs: InputParameter[];
    showAdvancedParameters?: boolean;
    hasAdvancedParameters?: boolean;
}
export interface OutputInfo {
    description?: string;
    type: string;
    format?: string;
    isAdvanced: boolean;
    isDynamic?: boolean;
    isInsideArray?: boolean;
    itemSchema?: OpenAPIV2.SchemaObject;
    key: string;
    name: string;
    parentArray?: string;
    required?: boolean;
    schema?: OpenAPIV2.SchemaObject;
    source?: string;
    title: string;
    value?: string;
    alias?: string;
}
export declare const DynamicLoadStatus: {
    readonly NOTSTARTED: "notstarted";
    readonly LOADING: "loading";
    readonly FAILED: "failed";
    readonly SUCCEEDED: "succeeded";
};
export type DynamicLoadStatus = (typeof DynamicLoadStatus)[keyof typeof DynamicLoadStatus];
export interface NodeInputs {
    dynamicLoadStatus?: DynamicLoadStatus;
    parameterGroups: Record<string, ParameterGroup>;
}
export interface NodeOutputs {
    dynamicLoadStatus?: DynamicLoadStatus;
    outputs: Record<string, OutputInfo>;
    originalOutputs?: Record<string, OutputInfo>;
}
type DependencyType = 'StaticSchema' | 'ApiSchema' | 'ListValues' | 'TreeNavigation' | 'AgentSchema';
export interface DependencyInfo {
    definition: any;
    dependencyType: DependencyType;
    dependentParameters: Record<string, {
        isValid: boolean;
    }>;
    filePickerInfo?: FilePickerInfo;
    parameter?: InputParameter | OutputParameter;
}
export interface NodeDependencies {
    inputs: Record<string, DependencyInfo>;
    outputs: Record<string, DependencyInfo>;
}
export interface OperationMetadata {
    iconUri: string;
    brandColor: string;
    description?: string;
    summary?: string;
}
export declare const ErrorLevel: {
    readonly Critical: 0;
    readonly Connection: 1;
    readonly DynamicInputs: 2;
    readonly DynamicOutputs: 3;
    readonly Default: 4;
};
export type ErrorLevel = (typeof ErrorLevel)[keyof typeof ErrorLevel];
export interface ErrorInfo {
    error?: any;
    level: ErrorLevel;
    message: string;
    code?: number;
}
export interface OperationMetadataState {
    operationInfo: Record<string, NodeOperation>;
    inputParameters: Record<string, NodeInputs>;
    outputParameters: Record<string, NodeOutputs>;
    dependencies: Record<string, NodeDependencies>;
    operationMetadata: Record<string, OperationMetadata>;
    settings: Record<string, Settings>;
    actionMetadata: Record<string, any>;
    staticResults: Record<string, NodeStaticResults>;
    repetitionInfos: Record<string, RepetitionContext>;
    errors: Record<string, Record<ErrorLevel, ErrorInfo | undefined>>;
    loadStatus: OperationMetadataLoadStatus;
    supportedChannels: Record<string, SupportedChannels[]>;
}
interface OperationMetadataLoadStatus {
    nodesInitialized: boolean;
    nodesAndDynamicDataInitialized: boolean;
}
export declare const initialState: OperationMetadataState;
export interface AddNodeOperationPayload extends NodeOperation {
    id: string;
}
export interface NodeOperation extends OperationInfo {
    type: string;
    kind?: string;
}
export interface NodeOperationInputsData {
    id: string;
    nodeInputs: NodeInputs;
    nodeDependencies: NodeDependencies;
    operationInfo: NodeOperation;
    nodeOutputs?: NodeOutputs;
    settings?: Settings;
    operationMetadata?: OperationMetadata;
}
export interface NodeData {
    id: string;
    nodeInputs: NodeInputs;
    nodeOutputs: NodeOutputs;
    nodeDependencies: NodeDependencies;
    operationMetadata: OperationMetadata;
    staticResult?: NodeStaticResults;
    settings?: Settings;
    supportedChannels?: SupportedChannels[];
    actionMetadata?: Record<string, any>;
    repetitionInfo?: RepetitionContext;
}
export interface AddSettingsPayload {
    id: string;
    settings: Settings;
    ignoreDirty?: boolean;
}
interface AddStaticResultsPayload {
    id: string;
    staticResults: NodeStaticResults;
}
interface AddDynamicOutputsPayload {
    nodeId: string;
    outputs: Record<string, OutputInfo>;
}
export interface ClearDynamicIOPayload {
    nodeId?: string;
    nodeIds?: string[];
    inputs?: boolean;
    outputs?: boolean;
    dynamicParameterKeys?: string[];
}
interface AddDynamicInputsPayload {
    nodeId: string;
    groupId: string;
    inputs: ParameterInfo[];
    rawInputs: InputParameter[];
    dependencies?: Record<string, DependencyInfo>;
}
export interface UpdateParametersPayload {
    nodeId: string;
    dependencies?: NodeDependencies;
    parameters: {
        groupId: string;
        parameterId: string;
        propertiesToUpdate: Partial<ParameterInfo>;
    }[];
    isUserAction?: boolean;
}
export interface InitializeNodesPayload {
    nodes: (NodeData | undefined)[];
    clearExisting?: boolean;
}
export declare const operationMetadataSlice: import("@reduxjs/toolkit").Slice<OperationMetadataState, {
    initializeNodeOperationInputsData: (state: WritableDraft<OperationMetadataState>, action: PayloadAction<NodeOperationInputsData[]>) => void;
    initializeOperationInfo: (state: WritableDraft<OperationMetadataState>, action: PayloadAction<AddNodeOperationPayload>) => void;
    initializeNodes: (state: WritableDraft<OperationMetadataState>, action: PayloadAction<InitializeNodesPayload>) => void;
    addDynamicInputs: (state: WritableDraft<OperationMetadataState>, action: PayloadAction<AddDynamicInputsPayload>) => void;
    addDynamicOutputs: (state: WritableDraft<OperationMetadataState>, action: PayloadAction<AddDynamicOutputsPayload>) => void;
    clearDynamicIO: (state: WritableDraft<OperationMetadataState>, action: PayloadAction<ClearDynamicIOPayload>) => void;
    updateAgentParametersInNode: (state: WritableDraft<OperationMetadataState>, action: PayloadAction<Array<{
        name: string;
        type: string;
        description: string;
    }>>) => void;
    updateNodeSettings: (state: WritableDraft<OperationMetadataState>, action: PayloadAction<AddSettingsPayload>) => void;
    updateStaticResults: (state: WritableDraft<OperationMetadataState>, action: PayloadAction<AddStaticResultsPayload>) => void;
    deleteStaticResult: (state: WritableDraft<OperationMetadataState>, action: PayloadAction<{
        id: string;
    }>) => void;
    updateNodeParameters: (state: WritableDraft<OperationMetadataState>, action: PayloadAction<UpdateParametersPayload>) => void;
    updateNodeParameterGroups: (state: WritableDraft<OperationMetadataState>, action: PayloadAction<{
        nodeId: string;
        parameterGroups: Record<string, ParameterGroup>;
    }>) => void;
    updateParameterConditionalVisibility: (state: WritableDraft<OperationMetadataState>, action: PayloadAction<{
        nodeId: string;
        groupId: string;
        parameterId: string;
        value?: boolean;
    }>) => void;
    updateParameterEditorViewModel: (state: WritableDraft<OperationMetadataState>, action: PayloadAction<{
        nodeId: string;
        groupId: string;
        parameterId: string;
        editorViewModel: any;
    }>) => void;
    updateParameterValidation: (state: WritableDraft<OperationMetadataState>, action: PayloadAction<{
        nodeId: string;
        groupId: string;
        parameterId: string;
        validationErrors: string[] | undefined;
        editorViewModel?: any;
    }>) => void;
    removeParameterValidationError: (state: WritableDraft<OperationMetadataState>, action: PayloadAction<{
        nodeId: string;
        groupId: string;
        parameterId: string;
        validationError: string;
    }>) => void;
    updateOutputs: (state: WritableDraft<OperationMetadataState>, action: PayloadAction<{
        id: string;
        nodeOutputs: NodeOutputs;
    }>) => void;
    updateActionMetadata: (state: WritableDraft<OperationMetadataState>, action: PayloadAction<{
        id: string;
        actionMetadata: Record<string, any>;
    }>) => void;
    updateRepetitionContext: (state: WritableDraft<OperationMetadataState>, action: PayloadAction<{
        id: string;
        repetition: RepetitionContext;
    }>) => void;
    updateOperationDescription: (state: WritableDraft<OperationMetadataState>, action: PayloadAction<{
        id: string;
        description: string;
    }>) => void;
    updateErrorDetails: (state: WritableDraft<OperationMetadataState>, action: PayloadAction<{
        id: string;
        errorInfo?: ErrorInfo;
        clear?: boolean;
    }>) => void;
    clearAllErrors: (state: WritableDraft<OperationMetadataState>) => void;
    deinitializeOperationInfo: (state: WritableDraft<OperationMetadataState>, action: PayloadAction<{
        id: string;
    }>) => void;
    deinitializeOperationInfos: (state: WritableDraft<OperationMetadataState>, action: PayloadAction<{
        ids: string[];
    }>) => void;
    deinitializeNodes: (state: WritableDraft<OperationMetadataState>, action: PayloadAction<string[]>) => void;
    updateDynamicDataLoadStatus: (state: WritableDraft<OperationMetadataState>, action: PayloadAction<boolean>) => void;
}, "operationMetadata">;
export declare const updateExistingInputTokenTitles: (state: OperationMetadataState, actionPayload: AddDynamicOutputsPayload) => void;
export declare const initializeNodes: import("@reduxjs/toolkit").ActionCreatorWithPayload<InitializeNodesPayload, "operationMetadata/initializeNodes">, initializeNodeOperationInputsData: import("@reduxjs/toolkit").ActionCreatorWithPayload<NodeOperationInputsData[], "operationMetadata/initializeNodeOperationInputsData">, initializeOperationInfo: import("@reduxjs/toolkit").ActionCreatorWithPayload<AddNodeOperationPayload, "operationMetadata/initializeOperationInfo">, updateNodeParameters: import("@reduxjs/toolkit").ActionCreatorWithPayload<UpdateParametersPayload, "operationMetadata/updateNodeParameters">, updateNodeParameterGroups: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    nodeId: string;
    parameterGroups: Record<string, ParameterGroup>;
}, "operationMetadata/updateNodeParameterGroups">, addDynamicInputs: import("@reduxjs/toolkit").ActionCreatorWithPayload<AddDynamicInputsPayload, "operationMetadata/addDynamicInputs">, addDynamicOutputs: import("@reduxjs/toolkit").ActionCreatorWithPayload<AddDynamicOutputsPayload, "operationMetadata/addDynamicOutputs">, clearDynamicIO: import("@reduxjs/toolkit").ActionCreatorWithPayload<ClearDynamicIOPayload, "operationMetadata/clearDynamicIO">, updateNodeSettings: import("@reduxjs/toolkit").ActionCreatorWithPayload<AddSettingsPayload, "operationMetadata/updateNodeSettings">, updateStaticResults: import("@reduxjs/toolkit").ActionCreatorWithPayload<AddStaticResultsPayload, "operationMetadata/updateStaticResults">, deleteStaticResult: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    id: string;
}, "operationMetadata/deleteStaticResult">, updateParameterConditionalVisibility: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    nodeId: string;
    groupId: string;
    parameterId: string;
    value?: boolean | undefined;
}, "operationMetadata/updateParameterConditionalVisibility">, updateParameterValidation: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    nodeId: string;
    groupId: string;
    parameterId: string;
    validationErrors: string[] | undefined;
    editorViewModel?: any;
}, "operationMetadata/updateParameterValidation">, updateParameterEditorViewModel: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    nodeId: string;
    groupId: string;
    parameterId: string;
    editorViewModel: any;
}, "operationMetadata/updateParameterEditorViewModel">, removeParameterValidationError: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    nodeId: string;
    groupId: string;
    parameterId: string;
    validationError: string;
}, "operationMetadata/removeParameterValidationError">, updateAgentParametersInNode: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    name: string;
    type: string;
    description: string;
}[], "operationMetadata/updateAgentParametersInNode">, updateOutputs: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    id: string;
    nodeOutputs: NodeOutputs;
}, "operationMetadata/updateOutputs">, updateActionMetadata: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    id: string;
    actionMetadata: Record<string, any>;
}, "operationMetadata/updateActionMetadata">, updateRepetitionContext: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    id: string;
    repetition: RepetitionContext;
}, "operationMetadata/updateRepetitionContext">, updateErrorDetails: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    id: string;
    errorInfo?: ErrorInfo | undefined;
    clear?: boolean | undefined;
}, "operationMetadata/updateErrorDetails">, clearAllErrors: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"operationMetadata/clearAllErrors">, deinitializeOperationInfo: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    id: string;
}, "operationMetadata/deinitializeOperationInfo">, deinitializeOperationInfos: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    ids: string[];
}, "operationMetadata/deinitializeOperationInfos">, deinitializeNodes: import("@reduxjs/toolkit").ActionCreatorWithPayload<string[], "operationMetadata/deinitializeNodes">, updateDynamicDataLoadStatus: import("@reduxjs/toolkit").ActionCreatorWithPayload<boolean, "operationMetadata/updateDynamicDataLoadStatus">, updateOperationDescription: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    id: string;
    description: string;
}, "operationMetadata/updateOperationDescription">;
declare const _default: import("@reduxjs/toolkit").Reducer<OperationMetadataState, import("@reduxjs/toolkit").AnyAction>;
export default _default;

import { getInputDependencies } from '../../actions/bjsworkflow/initialize';
import type { Settings } from '../../actions/bjsworkflow/settings';
import type { NodeStaticResults } from '../../actions/bjsworkflow/staticresults';
import { StaticResultOption } from '../../actions/bjsworkflow/staticresults';
import type { RepetitionContext } from '../../utils/parameters/helper';
import { resetNodesLoadStatus, resetWorkflowState } from '../global';
import { LogEntryLevel, LoggerService } from '@microsoft/designer-client-services-logic-apps';
import type { ParameterInfo } from '@microsoft/designer-ui';
import type { FilePickerInfo, InputParameter, OutputParameter, SwaggerParser } from '@microsoft/parsers-logic-apps';
import type { OpenAPIV2, OperationInfo } from '@microsoft/utils-logic-apps';
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface ParameterGroup {
  id: string;
  description?: string;
  parameters: ParameterInfo[];
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

export enum DynamicLoadStatus {
  NOTSTARTED,
  STARTED,
  FAILED,
  SUCCEEDED,
}

export interface NodeInputs {
  dynamicLoadStatus?: DynamicLoadStatus;
  parameterGroups: Record<string, ParameterGroup>;
}

export interface NodeOutputs {
  dynamicLoadStatus?: DynamicLoadStatus;
  outputs: Record<string, OutputInfo>;
  originalOutputs?: Record<string, OutputInfo>;
}

type DependencyType = 'StaticSchema' | 'ApiSchema' | 'ListValues' | 'TreeNavigation';

export interface DependencyInfo {
  definition: any; // This is the dependency definition from manifest/swagger.
  dependencyType: DependencyType;
  dependentParameters: Record<
    string,
    {
      isValid: boolean;
    }
  >;
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
}

export enum ErrorLevel {
  Critical = 0,
  Connection = 1,
  DynamicInputs = 2,
  DynamicOutputs = 3,
  Default = 4,
}

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
}

interface OperationMetadataLoadStatus {
  nodesInitialized: boolean;
  nodesAndDynamicDataInitialized: boolean;
}

const initialState: OperationMetadataState = {
  operationInfo: {},
  inputParameters: {},
  outputParameters: {},
  dependencies: {},
  settings: {},
  operationMetadata: {},
  actionMetadata: {},
  staticResults: {},
  repetitionInfos: {},
  errors: {},
  loadStatus: {
    nodesInitialized: false,
    nodesAndDynamicDataInitialized: false,
  },
};

export interface AddNodeOperationPayload extends NodeOperation {
  id: string;
}

export interface NodeOperation extends OperationInfo {
  type: string;
  kind?: string;
}

export interface NodeData {
  id: string;
  nodeInputs: NodeInputs;
  nodeOutputs: NodeOutputs;
  nodeDependencies: NodeDependencies;
  operationMetadata: OperationMetadata;
  staticResult?: NodeStaticResults;
  settings?: Settings;
  actionMetadata?: Record<string, any>;
  repetitionInfo?: RepetitionContext;
}

interface AddSettingsPayload {
  id: string;
  settings: Settings;
}

interface AddStaticResultsPayload {
  id: string;
  staticResults: NodeStaticResults;
}

interface AddDynamicOutputsPayload {
  nodeId: string;
  outputs: Record<string, OutputInfo>;
}

interface AddDynamicInputsPayload {
  nodeId: string;
  groupId: string;
  inputs: ParameterInfo[];
  newInputs: InputParameter[];
  swagger?: SwaggerParser;
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

export const operationMetadataSlice = createSlice({
  name: 'operationMetadata',
  initialState,
  reducers: {
    initializeOperationInfo: (state, action: PayloadAction<AddNodeOperationPayload>) => {
      const { id, connectorId, operationId, type, kind } = action.payload;
      state.operationInfo[id] = { connectorId, operationId, type, kind };
    },
    initializeNodes: (state, action: PayloadAction<(NodeData | undefined)[]>) => {
      for (const nodeData of action.payload) {
        if (!nodeData) return;

        const { id, nodeInputs, nodeOutputs, nodeDependencies, settings, operationMetadata, actionMetadata, staticResult, repetitionInfo } =
          nodeData;
        state.inputParameters[id] = nodeInputs;
        state.outputParameters[id] = nodeOutputs;
        state.dependencies[id] = nodeDependencies;
        state.operationMetadata[id] = operationMetadata;

        if (settings) {
          console.log(id, settings);
          state.settings[id] = settings;
        }

        if (staticResult) {
          state.staticResults[id] = staticResult;
        }

        if (actionMetadata) {
          state.actionMetadata[id] = actionMetadata;
        }

        if (repetitionInfo) {
          state.repetitionInfos[id] = repetitionInfo;
        }
      }
      state.loadStatus.nodesInitialized = true;

      LoggerService().log({
        level: LogEntryLevel.Verbose,
        area: 'Designer:Operation Metadata Slice',
        message: action.type,
      });
    },
    addDynamicInputs: (state, action: PayloadAction<AddDynamicInputsPayload>) => {
      const { nodeId, groupId, inputs, newInputs: rawInputs, swagger } = action.payload;
      if (state.inputParameters[nodeId] && state.inputParameters[nodeId].parameterGroups[groupId]) {
        const { parameters } = state.inputParameters[nodeId].parameterGroups[groupId];
        const newParameters = [...parameters];
        for (const input of inputs) {
          const index = newParameters.findIndex((parameter) => parameter.parameterKey === input.parameterKey);
          if (index > -1) {
            newParameters.splice(index, 1, input);
          } else {
            newParameters.push(input);
          }
        }
        state.inputParameters[nodeId].parameterGroups[groupId].parameters = newParameters;
      }

      const dependencies = getInputDependencies(state.inputParameters[nodeId], rawInputs, swagger);
      if (dependencies) {
        state.dependencies[nodeId].inputs = { ...state.dependencies[nodeId].inputs, ...dependencies };
      }
    },
    addDynamicOutputs: (state, action: PayloadAction<AddDynamicOutputsPayload>) => {
      const { nodeId, outputs } = action.payload;
      if (state.outputParameters[nodeId]) {
        state.outputParameters[nodeId].outputs = { ...state.outputParameters[nodeId].outputs, ...outputs };
      }
    },
    clearDynamicInputs: (state, action: PayloadAction<string>) => {
      const nodeId = action.payload;
      if (state.inputParameters[nodeId]) {
        for (const groupId of Object.keys(state.inputParameters[nodeId].parameterGroups)) {
          state.inputParameters[nodeId].parameterGroups[groupId].parameters = state.inputParameters[nodeId].parameterGroups[
            groupId
          ].parameters.filter((parameter) => !parameter.info.isDynamic);
        }
      }

      const inputDependencies = state.dependencies[nodeId]?.inputs;
      for (const inputKey of Object.keys(inputDependencies ?? {})) {
        if (inputDependencies[inputKey].parameter?.isDynamic && inputDependencies[inputKey].dependencyType !== 'ApiSchema') {
          delete state.dependencies[nodeId].inputs[inputKey];
        }
      }

      if (state.errors[nodeId]?.[ErrorLevel.DynamicInputs]) {
        delete state.errors[nodeId][ErrorLevel.DynamicInputs];
      }
    },
    clearDynamicOutputs: (state, action: PayloadAction<string>) => {
      const nodeId = action.payload;
      if (state.outputParameters[nodeId]) {
        state.outputParameters[nodeId].outputs = Object.keys(state.outputParameters[nodeId].outputs).reduce(
          (result: Record<string, OutputInfo>, outputKey: string) => {
            if (!state.outputParameters[nodeId].outputs[outputKey].isDynamic) {
              return { [outputKey]: state.outputParameters[nodeId].outputs[outputKey] };
            }

            return result;
          },
          {}
        ) as Record<string, OutputInfo>;
      }

      if (state.errors[nodeId]?.[ErrorLevel.DynamicOutputs]) {
        delete state.errors[nodeId][ErrorLevel.DynamicOutputs];
      }
    },
    updateNodeSettings: (state, action: PayloadAction<AddSettingsPayload>) => {
      const { id, settings } = action.payload;
      if (!state.settings[id]) {
        state.settings[id] = {};
      }

      state.settings[id] = { ...state.settings[id], ...settings };

      LoggerService().log({
        level: LogEntryLevel.Verbose,
        area: 'Designer:Operation Metadata Slice',
        message: action.type,
        args: [action.payload.id],
      });
    },
    updateStaticResults: (state, action: PayloadAction<AddStaticResultsPayload>) => {
      const { id, staticResults } = action.payload;
      if (!state.staticResults[id]) {
        state.staticResults[id] = { name: '', staticResultOptions: StaticResultOption.DISABLED };
      }

      state.staticResults[id] = { ...state.staticResults[id], ...staticResults };

      LoggerService().log({
        level: LogEntryLevel.Verbose,
        area: 'Designer:Operation Metadata Slice',
        message: action.type,
        args: [action.payload.id],
      });
    },
    updateNodeParameters: (state, action: PayloadAction<UpdateParametersPayload>) => {
      const { nodeId, dependencies, parameters } = action.payload;
      for (const payload of parameters) {
        const { groupId, parameterId, propertiesToUpdate } = payload;
        const nodeInputs = state.inputParameters[nodeId];

        if (nodeInputs) {
          const parameterGroup = nodeInputs.parameterGroups[groupId];
          const index = parameterGroup.parameters.findIndex((parameter) => parameter.id === parameterId);
          if (index > -1) {
            parameterGroup.parameters[index] = { ...parameterGroup.parameters[index], ...propertiesToUpdate };
            state.inputParameters[nodeId].parameterGroups[groupId] = parameterGroup;
          }
        }
      }

      if (dependencies?.inputs) {
        state.dependencies[nodeId].inputs = { ...state.dependencies[nodeId].inputs, ...dependencies.inputs };
      }

      if (dependencies?.outputs) {
        state.dependencies[nodeId].outputs = { ...state.dependencies[nodeId].outputs, ...dependencies.outputs };
      }

      LoggerService().log({
        level: LogEntryLevel.Verbose,
        area: 'Designer:Operation Metadata Slice',
        message: action.type,
        args: [action.payload.nodeId],
      });
    },
    updateParameterConditionalVisibility: (
      state,
      action: PayloadAction<{ nodeId: string; groupId: string; parameterId: string; value?: boolean }>
    ) => {
      const { nodeId, groupId, parameterId, value } = action.payload;
      const index = state.inputParameters[nodeId].parameterGroups[groupId].parameters.findIndex(
        (parameter) => parameter.id === parameterId
      );
      if (index > -1) {
        state.inputParameters[nodeId].parameterGroups[groupId].parameters[index].conditionalVisibility = value;
        if (value === false) {
          state.inputParameters[nodeId].parameterGroups[groupId].parameters[index].value = [];
          state.inputParameters[nodeId].parameterGroups[groupId].parameters[index].preservedValue = undefined;
        }
      }

      LoggerService().log({
        level: LogEntryLevel.Verbose,
        area: 'Designer:Operation Metadata Slice',
        message: action.type,
        args: [action.payload],
      });
    },
    updateParameterValidation: (
      state,
      action: PayloadAction<{ nodeId: string; groupId: string; parameterId: string; validationErrors: string[] | undefined }>
    ) => {
      const { nodeId, groupId, parameterId, validationErrors } = action.payload;
      const index = state.inputParameters[nodeId].parameterGroups[groupId].parameters.findIndex(
        (parameter) => parameter.id === parameterId
      );
      if (index > -1) {
        state.inputParameters[nodeId].parameterGroups[groupId].parameters[index].validationErrors = validationErrors;
      }
    },
    removeParameterValidationError: (
      state,
      action: PayloadAction<{ nodeId: string; groupId: string; parameterId: string; validationError: string }>
    ) => {
      const { nodeId, groupId, parameterId, validationError } = action.payload;
      const index = state.inputParameters[nodeId].parameterGroups[groupId].parameters.findIndex(
        (parameter) => parameter.id === parameterId
      );
      if (index > -1) {
        state.inputParameters[nodeId].parameterGroups[groupId].parameters[index].validationErrors = state.inputParameters[
          nodeId
        ].parameterGroups[groupId].parameters[index].validationErrors?.filter((error) => error !== validationError);
      }
    },
    updateOutputs: (state, action: PayloadAction<{ id: string; nodeOutputs: NodeOutputs }>) => {
      const { id, nodeOutputs } = action.payload;
      if (state.outputParameters[id]) state.outputParameters[id] = nodeOutputs;
    },
    updateActionMetadata: (state, action: PayloadAction<{ id: string; actionMetadata: Record<string, any> }>) => {
      const { id, actionMetadata } = action.payload;
      state.actionMetadata[id] = {
        ...state.actionMetadata[id],
        ...actionMetadata,
      };
    },
    updateRepetitionContext: (state, action: PayloadAction<{ id: string; repetition: RepetitionContext }>) => {
      const { id, repetition } = action.payload;
      state.repetitionInfos[id] = {
        ...state.repetitionInfos[id],
        ...repetition,
      };
    },
    updateErrorDetails: (state, action: PayloadAction<{ id: string; errorInfo?: ErrorInfo; clear?: boolean }>) => {
      const { id, errorInfo, clear } = action.payload;
      if (errorInfo) {
        state.errors[id] = { ...state.errors[id], [errorInfo.level]: errorInfo };
      } else if (clear) {
        delete state.errors[id];
      }
    },
    deinitializeOperationInfo: (state, action: PayloadAction<{ id: string }>) => {
      const { id } = action.payload;
      delete state.operationInfo[id];
    },
    deinitializeNodes: (state, action: PayloadAction<string[]>) => {
      for (const id of action.payload) {
        delete state.inputParameters[id];
        delete state.outputParameters[id];
        delete state.dependencies[id];
        delete state.operationMetadata[id];
        delete state.staticResults[id];
        delete state.settings[id];
        delete state.actionMetadata[id];
        delete state.repetitionInfos[id];
        delete state.errors[id];
      }
    },
    updateDynamicDataLoadStatus: (state, action: PayloadAction<boolean>) => {
      state.loadStatus.nodesAndDynamicDataInitialized = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(resetWorkflowState, () => initialState);
    builder.addCase(resetNodesLoadStatus, (state) => {
      state.loadStatus.nodesInitialized = false;
      state.loadStatus.nodesAndDynamicDataInitialized = false;
    });
  },
});

// Action creators are generated for each case reducer function
export const {
  initializeNodes,
  initializeOperationInfo,
  updateNodeParameters,
  addDynamicInputs,
  addDynamicOutputs,
  clearDynamicInputs,
  clearDynamicOutputs,
  updateNodeSettings,
  updateStaticResults,
  updateParameterConditionalVisibility,
  updateParameterValidation,
  removeParameterValidationError,
  updateOutputs,
  updateActionMetadata,
  updateRepetitionContext,
  updateErrorDetails,
  deinitializeOperationInfo,
  deinitializeNodes,
  updateDynamicDataLoadStatus,
} = operationMetadataSlice.actions;

export default operationMetadataSlice.reducer;

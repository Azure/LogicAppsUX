import type { Settings } from '../../actions/bjsworkflow/settings';
import type { NodeStaticResults } from '../../actions/bjsworkflow/staticresults';
import { StaticResultOption } from '../../actions/bjsworkflow/staticresults';
import type { RepetitionContext } from '../../utils/parameters/helper';
import { createTokenValueSegment, isTokenValueSegment, isValueSegment } from '../../utils/parameters/segment';
import { getTokenTitle, normalizeKey } from '../../utils/tokens';
import { resetNodesLoadStatus, resetTemplatesState, resetWorkflowState, setStateAfterUndoRedo } from '../global';
import { LogEntryLevel, LoggerService, TokenType, filterRecord, getRecordEntry } from '@microsoft/logic-apps-shared';
import type { ParameterInfo } from '@microsoft/designer-ui';
import type {
  FilePickerInfo,
  InputParameter,
  OutputParameter,
  OpenAPIV2,
  OperationInfo,
  SupportedChannels,
} from '@microsoft/logic-apps-shared';
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { WritableDraft } from 'immer/dist/internal';
import type { UndoRedoPartialRootState } from '../undoRedo/undoRedoTypes';
import { deleteWorkflowData } from '../../actions/bjsworkflow/configuretemplate';
import { delimiter } from '../../configuretemplate/utils/helper';
import { initializeOperationsMetadata } from '../../actions/bjsworkflow/mcp';

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

export const DynamicLoadStatus = {
  NOTSTARTED: 'notstarted',
  LOADING: 'loading',
  FAILED: 'failed',
  SUCCEEDED: 'succeeded',
} as const;
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
  description?: string;
  summary?: string;
}

export const ErrorLevel = {
  Critical: 0,
  Connection: 1,
  DynamicInputs: 2,
  DynamicOutputs: 3,
  Default: 4,
} as const;
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
  isInitializingOperations: boolean;
}

export const initialState: OperationMetadataState = {
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
  supportedChannels: {},
  loadStatus: {
    nodesInitialized: false,
    nodesAndDynamicDataInitialized: false,
    isInitializingOperations: false,
  },
};

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
  clearExisting?: boolean; // Optional flag to clear the existing nodes
}

export const operationMetadataSlice = createSlice({
  name: 'operationMetadata',
  initialState: initialState,
  reducers: {
    initializeNodeOperationInputsData: (state, action: PayloadAction<NodeOperationInputsData[]>) => {
      const nodes = action.payload;

      for (const nodeData of nodes) {
        if (!nodeData) {
          return;
        }

        const { id, nodeInputs, nodeOutputs, nodeDependencies, operationInfo, settings, operationMetadata } = nodeData;
        state.inputParameters[id] = nodeInputs;
        state.dependencies[id] = nodeDependencies;
        state.operationInfo[id] = operationInfo;

        if (nodeOutputs) {
          state.outputParameters[id] = nodeOutputs;
        }

        if (settings) {
          state.settings[id] = settings;
        }

        if (operationMetadata) {
          state.operationMetadata[id] = operationMetadata;
        }
      }
      state.loadStatus.nodesInitialized = true;
    },
    initializeOperationInfo: (state, action: PayloadAction<AddNodeOperationPayload>) => {
      const { id, connectorId, operationId, type, kind } = action.payload;
      state.operationInfo[id] = { connectorId, operationId, type, kind };
    },
    initializeNodes: (state, action: PayloadAction<InitializeNodesPayload>) => {
      const { nodes, clearExisting = false } = action.payload;
      if (clearExisting) {
        state.inputParameters = {};
        state.outputParameters = {};
        state.dependencies = {};
        state.operationMetadata = {};
        state.settings = {};
        state.staticResults = {};
        state.actionMetadata = {};
        state.repetitionInfos = {};
        state.supportedChannels = {};
      }

      for (const nodeData of nodes) {
        if (!nodeData) {
          return;
        }

        const {
          id,
          nodeInputs,
          nodeOutputs,
          nodeDependencies,
          settings,
          operationMetadata,
          actionMetadata,
          staticResult,
          repetitionInfo,
          supportedChannels,
        } = nodeData;
        state.inputParameters[id] = nodeInputs;
        state.outputParameters[id] = nodeOutputs;
        state.dependencies[id] = nodeDependencies;
        state.operationMetadata[id] = operationMetadata;
        state.supportedChannels[id] = supportedChannels ?? [];

        if (settings) {
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
      const { nodeId, groupId, inputs, rawInputs, dependencies } = action.payload;
      const inputParameters = getRecordEntry(state.inputParameters, nodeId) ?? {
        parameterGroups: {},
      };
      const parameterGroup = getRecordEntry(inputParameters?.parameterGroups, groupId);
      if (parameterGroup) {
        parameterGroup.parameters = inputs;
        parameterGroup.rawInputs = rawInputs;
      }

      if (dependencies) {
        state.dependencies[nodeId].inputs = {
          ...state.dependencies[nodeId].inputs,
          ...dependencies,
        };
      }
    },
    addDynamicOutputs: (state, action: PayloadAction<AddDynamicOutputsPayload>) => {
      const { nodeId, outputs } = action.payload;
      const outputParameters = getRecordEntry(state.outputParameters, nodeId);
      if (outputParameters) {
        outputParameters.outputs = { ...outputParameters.outputs, ...outputs };
      }

      updateExistingInputTokenTitles(state, action.payload);
    },
    clearDynamicIO: (state, action: PayloadAction<ClearDynamicIOPayload>) => {
      const { nodeId, nodeIds: _nodeIds, inputs = true, outputs = true, dynamicParameterKeys = [] } = action.payload;
      const nodeIds = _nodeIds ?? [nodeId];
      for (const nodeId of nodeIds) {
        const nodeErrors = getRecordEntry(state.errors, nodeId);

        if (inputs) {
          delete nodeErrors?.[ErrorLevel.DynamicInputs];

          const inputParameters = getRecordEntry(state.inputParameters, nodeId);
          const deletedDynamicParameters: string[] = [];
          if (inputParameters) {
            for (const group of Object.values(inputParameters.parameterGroups)) {
              group.parameters = group.parameters.filter((parameter) => {
                const shouldDelete =
                  parameter.info.isDynamic &&
                  (!dynamicParameterKeys.length || dynamicParameterKeys.includes(parameter.info.dynamicParameterReference ?? ''));
                if (shouldDelete) {
                  deletedDynamicParameters.push(parameter.parameterKey);
                  return false;
                }

                return true;
              });
            }
          }

          const inputDependencies = getRecordEntry(state.dependencies, nodeId)?.inputs as WritableDraft<Record<string, DependencyInfo>>;
          for (const inputKey of Object.keys(inputDependencies ?? {})) {
            if (inputDependencies[inputKey].parameter?.isDynamic && deletedDynamicParameters.includes(inputKey)) {
              delete getRecordEntry(state.dependencies, nodeId)?.inputs[inputKey];
            }
          }
        }

        if (outputs) {
          delete nodeErrors?.[ErrorLevel.DynamicOutputs];

          const outputParameters = getRecordEntry(state.outputParameters, nodeId);
          if (outputParameters) {
            outputParameters.outputs = filterRecord(outputParameters.outputs, (_key, value) => !value.isDynamic);
          }
        }
      }
    },
    updateAgentParametersInNode: (state, action: PayloadAction<Array<{ name: string; type: string; description: string }>>) => {
      const updatesMap = new Map(action.payload.map(({ name, type, description }) => [name, { type, description }]));
      Object.entries(state.inputParameters).forEach(([_nodeId, nodeInputs]) => {
        Object.entries(nodeInputs.parameterGroups).forEach(([_parameterId, parameterGroup]) => {
          parameterGroup.parameters.forEach((parameter) => {
            parameter.value.forEach((segment) => {
              if (
                isTokenValueSegment(segment) &&
                segment.token?.tokenType === TokenType.AGENTPARAMETER &&
                segment.token.name &&
                updatesMap.has(segment.token.name)
              ) {
                const { type, description } = updatesMap.get(segment.token.name)!;
                segment.token.type = type;
                segment.token.description = description;
              }
            });
          });
        });
      });
    },
    updateNodeSettings: (state, action: PayloadAction<AddSettingsPayload>) => {
      const { id, settings } = action.payload;
      const nodeSettings = getRecordEntry(state.settings, id);
      if (!nodeSettings) {
        state.settings[id] = {};
      }
      state.settings[id] = { ...nodeSettings, ...settings };

      LoggerService().log({
        level: LogEntryLevel.Verbose,
        area: 'Designer:Operation Metadata Slice',
        message: action.type,
        args: [action.payload.id],
      });
    },
    updateStaticResults: (state, action: PayloadAction<AddStaticResultsPayload>) => {
      const { id, staticResults } = action.payload;
      const nodeStaticResults = getRecordEntry(state.staticResults, id);
      if (!nodeStaticResults) {
        state.staticResults[id] = {
          name: '',
          staticResultOptions: StaticResultOption.DISABLED,
        };
      }
      state.staticResults[id] = { ...nodeStaticResults, ...staticResults };

      LoggerService().log({
        level: LogEntryLevel.Verbose,
        area: 'Designer:Operation Metadata Slice',
        message: action.type,
        args: [action.payload.id],
      });
    },
    deleteStaticResult: (state, action: PayloadAction<{ id: string }>) => {
      const { id } = action.payload;
      delete state.staticResults[id];

      LoggerService().log({
        level: LogEntryLevel.Verbose,
        area: 'Designer:Operation Metadata Slice',
        message: action.type,
        args: [action.payload.id],
      });
    },
    updateNodeParameters: (state, action: PayloadAction<UpdateParametersPayload>) => {
      const { nodeId, dependencies, parameters } = action.payload;
      const nodeInputs = getRecordEntry(state.inputParameters, nodeId);
      if (nodeInputs) {
        for (const payload of parameters) {
          const { groupId, parameterId, propertiesToUpdate } = payload;

          const parameterGroup = nodeInputs.parameterGroups[groupId];
          const index = parameterGroup.parameters.findIndex((parameter) => parameter.id === parameterId);
          if (index > -1) {
            parameterGroup.parameters[index] = {
              ...parameterGroup.parameters[index],
              ...propertiesToUpdate,
            };
            nodeInputs.parameterGroups[groupId] = parameterGroup;
          }
        }
      }

      const nodeDependencies = getRecordEntry(state.dependencies, nodeId);
      if (nodeDependencies && dependencies?.inputs) {
        nodeDependencies.inputs = {
          ...nodeDependencies.inputs,
          ...dependencies.inputs,
        };
      }
      if (nodeDependencies && dependencies?.outputs) {
        nodeDependencies.outputs = {
          ...nodeDependencies.outputs,
          ...dependencies.outputs,
        };
      }
    },
    updateNodeParameterGroups: (
      state,
      action: PayloadAction<{
        nodeId: string;
        parameterGroups: Record<string, ParameterGroup>;
      }>
    ) => {
      const { nodeId, parameterGroups } = action.payload;
      const nodeInputs = getRecordEntry(state.inputParameters, nodeId);
      if (nodeInputs) {
        nodeInputs.parameterGroups = parameterGroups;
      }
    },
    updateParameterConditionalVisibility: (
      state,
      action: PayloadAction<{
        nodeId: string;
        groupId: string;
        parameterId: string;
        value?: boolean;
      }>
    ) => {
      const { nodeId, groupId, parameterId, value } = action.payload;
      const inputParameters = getRecordEntry(state.inputParameters, nodeId);
      const parameterGroup = getRecordEntry(inputParameters?.parameterGroups, groupId);
      if (!inputParameters || !parameterGroup) {
        return;
      }
      const index = parameterGroup.parameters.findIndex((parameter) => parameter.id === parameterId);
      if (index > -1) {
        parameterGroup.parameters[index].conditionalVisibility = value;
        if (value === false) {
          parameterGroup.parameters[index].value = [];
          parameterGroup.parameters[index].preservedValue = undefined;
        }
      }

      LoggerService().log({
        level: LogEntryLevel.Verbose,
        area: 'Designer:Operation Metadata Slice',
        message: action.type,
        args: [action.payload],
      });
    },
    updateParameterEditorViewModel: (
      state,
      action: PayloadAction<{
        nodeId: string;
        groupId: string;
        parameterId: string;
        editorViewModel: any;
      }>
    ) => {
      const { nodeId, groupId, parameterId, editorViewModel } = action.payload;
      const inputParameters = getRecordEntry(state.inputParameters, nodeId);
      const parameterGroup = getRecordEntry(inputParameters?.parameterGroups, groupId);
      if (!inputParameters || !parameterGroup) {
        return;
      }
      const index = parameterGroup.parameters.findIndex((parameter) => parameter.id === parameterId);
      if (index > -1) {
        parameterGroup.parameters[index].editorViewModel = editorViewModel;
      }
    },
    updateParameterValidation: (
      state,
      action: PayloadAction<{
        nodeId: string;
        groupId: string;
        parameterId: string;
        validationErrors: string[] | undefined;
        editorViewModel?: any; // To update validation on the editor level
      }>
    ) => {
      const { nodeId, groupId, parameterId, validationErrors, editorViewModel } = action.payload;
      const inputParameters = getRecordEntry(state.inputParameters, nodeId);
      const parameterGroup = getRecordEntry(inputParameters?.parameterGroups, groupId);
      if (!inputParameters || !parameterGroup) {
        return;
      }
      const index = parameterGroup.parameters.findIndex((parameter) => parameter.id === parameterId);
      if (index > -1) {
        parameterGroup.parameters[index].validationErrors = validationErrors;
        if (editorViewModel) {
          parameterGroup.parameters[index].editorViewModel = editorViewModel;
        }
      }
    },
    removeParameterValidationError: (
      state,
      action: PayloadAction<{
        nodeId: string;
        groupId: string;
        parameterId: string;
        validationError: string;
      }>
    ) => {
      const { nodeId, groupId, parameterId, validationError } = action.payload;
      const inputParameters = getRecordEntry(state.inputParameters, nodeId);
      const parameterGroup = getRecordEntry(inputParameters?.parameterGroups, groupId);
      if (!inputParameters || !parameterGroup) {
        return;
      }
      const index = parameterGroup.parameters.findIndex((parameter) => parameter.id === parameterId);
      if (index > -1) {
        parameterGroup.parameters[index].validationErrors = parameterGroup.parameters[index].validationErrors?.filter(
          (error) => error !== validationError
        );
      }
    },
    updateOutputs: (state, action: PayloadAction<{ id: string; nodeOutputs: NodeOutputs }>) => {
      const { id, nodeOutputs } = action.payload;
      const outputParameters = getRecordEntry(state.outputParameters, id);
      if (outputParameters) {
        state.outputParameters[id] = nodeOutputs;
      }
    },
    updateActionMetadata: (state, action: PayloadAction<{ id: string; actionMetadata: Record<string, any> }>) => {
      const { id, actionMetadata } = action.payload;
      const nodeMetadata = getRecordEntry(state.actionMetadata, id);
      state.actionMetadata[id] = { ...nodeMetadata, ...actionMetadata };
    },
    updateRepetitionContext: (state, action: PayloadAction<{ id: string; repetition: RepetitionContext }>) => {
      const { id, repetition } = action.payload;
      const nodeRepetition = getRecordEntry(state.repetitionInfos, id);
      state.repetitionInfos[id] = { ...nodeRepetition, ...repetition };
    },
    updateOperationDescription: (state, action: PayloadAction<{ id: string; description: string }>) => {
      const { id, description } = action.payload;
      const operationMetadata = getRecordEntry(state.operationMetadata, id);
      if (operationMetadata) {
        state.operationMetadata[id] = { ...operationMetadata, description };
      }
    },
    updateErrorDetails: (
      state,
      action: PayloadAction<{
        id: string;
        errorInfo?: ErrorInfo;
        clear?: boolean;
      }>
    ) => {
      const { id, errorInfo, clear } = action.payload;
      if (errorInfo) {
        state.errors[id] = {
          ...(getRecordEntry(state.errors, id) as any),
          [errorInfo.level]: errorInfo,
        };
      } else if (clear) {
        delete state.errors[id];
      }
    },
    deinitializeOperationInfo: (state, action: PayloadAction<{ id: string }>) => {
      const { id } = action.payload;
      delete state.operationInfo[id];
    },
    deinitializeOperationInfos: (state, action: PayloadAction<{ ids: string[] }>) => {
      const { ids } = action.payload;
      for (const operationId of ids) {
        delete state.operationInfo[operationId];
      }
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
    builder.addCase(resetTemplatesState, () => initialState);
    builder.addCase(resetNodesLoadStatus, (state) => {
      state.loadStatus.nodesInitialized = false;
      state.loadStatus.nodesAndDynamicDataInitialized = false;
    });
    builder.addCase(setStateAfterUndoRedo, (_, action: PayloadAction<UndoRedoPartialRootState>) => action.payload.operations);
    builder.addCase(deleteWorkflowData.fulfilled, (state, action: PayloadAction<{ ids: string[] }>) => {
      for (const id of action.payload.ids) {
        const nodeIds = Object.keys(state.operationInfo).filter((nodeId) =>
          nodeId.toLowerCase().startsWith(`${id.toLowerCase()}${delimiter}`)
        );

        for (const nodeId of nodeIds) {
          delete state.inputParameters[nodeId];
          delete state.dependencies[nodeId];
          delete state.operationInfo[nodeId];
        }
      }
    });
    builder.addCase(initializeOperationsMetadata.pending, (state) => {
      state.loadStatus.isInitializingOperations = true;
    });
    builder.addCase(initializeOperationsMetadata.fulfilled, (state) => {
      state.loadStatus.isInitializingOperations = false;
    });
    builder.addCase(initializeOperationsMetadata.rejected, (state) => {
      state.loadStatus.isInitializingOperations = false;
    });
  },
});

// Helper function to update token titles in any nested structure
const updateTokenTitlesInViewModel = (viewModel: any, tokenTitles: Record<string, string>): any => {
  if (!viewModel || typeof viewModel !== 'object') {
    return viewModel;
  }

  // Handle ValueSegment arrays - base case for our editors
  if (Array.isArray(viewModel) && viewModel.every((item) => isValueSegment(item))) {
    let hasChanges = false;
    const updatedSegments = viewModel.map((segment) => {
      if (isTokenValueSegment(segment) && segment.token?.key) {
        const normalizedKey = normalizeKey(segment.token.key);
        if (normalizedKey in tokenTitles) {
          hasChanges = true;
          return createTokenValueSegment({ ...segment.token, title: tokenTitles[normalizedKey] }, segment.value, segment.type);
        }
      }
      return segment;
    });

    return hasChanges ? updatedSegments : viewModel;
  }

  // Handle arrays - only create new array if changes made
  if (Array.isArray(viewModel)) {
    let hasChanges = false;
    const updatedArray = viewModel.map((item) => {
      const updated = updateTokenTitlesInViewModel(item, tokenTitles);
      if (updated !== item) {
        hasChanges = true;
      }
      return updated;
    });

    return hasChanges ? updatedArray : viewModel;
  }

  let hasChanges = false;
  const updatedObject: any = {};

  for (const [key, value] of Object.entries(viewModel)) {
    const updatedValue = updateTokenTitlesInViewModel(value, tokenTitles);
    updatedObject[key] = updatedValue;
    if (updatedValue !== value) {
      hasChanges = true;
    }
  }

  return hasChanges ? updatedObject : viewModel;
};

export const updateExistingInputTokenTitles = (state: OperationMetadataState, actionPayload: AddDynamicOutputsPayload) => {
  const { outputs } = actionPayload;

  if (!outputs || Object.keys(outputs).length === 0) {
    return;
  }

  // Token titles lookup
  const tokenTitles: Record<string, string> = {};
  for (const outputValue of Object.values(outputs)) {
    const normalizedKey = normalizeKey(outputValue.key);
    tokenTitles[normalizedKey] = getTokenTitle(outputValue);
  }

  if (Object.keys(tokenTitles).length === 0) {
    return;
  }

  Object.entries(state.inputParameters).forEach(([_nodeId, nodeInputs]) => {
    Object.entries(nodeInputs.parameterGroups).forEach(([_parameterId, parameterGroup]) => {
      parameterGroup.parameters = parameterGroup.parameters.map((parameter) => {
        let hasValueChanges = false;
        const updatedValue = parameter.value.map((segment) => {
          if (isTokenValueSegment(segment) && segment.token?.key) {
            const normalizedKey = normalizeKey(segment.token.key);
            if (normalizedKey in tokenTitles) {
              hasValueChanges = true;
              return createTokenValueSegment({ ...segment.token, title: tokenTitles[normalizedKey] }, segment.value, segment.type);
            }
          }
          return segment;
        });

        const updatedEditorViewModel = parameter.editorViewModel
          ? updateTokenTitlesInViewModel(parameter.editorViewModel, tokenTitles)
          : parameter.editorViewModel;

        // Only create new parameter object if there were changes
        if (hasValueChanges || updatedEditorViewModel !== parameter.editorViewModel) {
          return {
            ...parameter,
            value: hasValueChanges ? updatedValue : parameter.value,
            editorViewModel: updatedEditorViewModel,
          };
        }

        return parameter;
      });
    });
  });
};

// Action creators are generated for each case reducer function
export const {
  initializeNodes,
  initializeNodeOperationInputsData,
  initializeOperationInfo,
  updateNodeParameters,
  updateNodeParameterGroups,
  addDynamicInputs,
  addDynamicOutputs,
  clearDynamicIO,
  updateNodeSettings,
  updateStaticResults,
  deleteStaticResult,
  updateParameterConditionalVisibility,
  updateParameterValidation,
  updateParameterEditorViewModel,
  removeParameterValidationError,
  updateAgentParametersInNode,
  updateOutputs,
  updateActionMetadata,
  updateRepetitionContext,
  updateErrorDetails,
  deinitializeOperationInfo,
  deinitializeOperationInfos,
  deinitializeNodes,
  updateDynamicDataLoadStatus,
  updateOperationDescription,
} = operationMetadataSlice.actions;

export default operationMetadataSlice.reducer;

import type { Settings } from '../../actions/bjsworkflow/settings';
import type { InputParameter, OutputParameter } from '@microsoft-logic-apps/parsers';
import type { OperationInfo } from '@microsoft-logic-apps/utils';
import type { ParameterInfo } from '@microsoft/designer-ui';
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
  source?: string;
  title: string;
  value?: string;
}

export interface NodeInputs {
  isLoading?: boolean;
  parameterGroups: Record<string, ParameterGroup>;
}

export interface NodeOutputs {
  isLoading?: boolean;
  outputs: Record<string, OutputInfo>;
}

type DependencyType = 'StaticSchema' | 'ApiSchema' | 'ListValues';
export interface DependencyInfo {
  definition: any; // This is the dependency definition from manifest/swagger.
  dependencyType: DependencyType;
  dependentParameters: Record<
    string,
    {
      isValid: boolean;
    }
  >;
  parameter?: InputParameter | OutputParameter;
}

export interface NodeDependencies {
  inputs: Record<string, DependencyInfo>;
  outputs: Record<string, DependencyInfo>;
}

export interface OperationMetadataState {
  operationInfo: Record<string, NodeOperation>;
  inputParameters: Record<string, NodeInputs>;
  outputParameters: Record<string, NodeOutputs>;
  settings: Record<string, Settings>;
  dependencies: Record<string, NodeDependencies>;
}

const initialState: OperationMetadataState = {
  operationInfo: {},
  inputParameters: {},
  outputParameters: {},
  dependencies: {},
  settings: {},
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
  settings?: Settings;
}
interface AddSettingsPayload {
  id: string;
  settings: Settings;
}

interface AddDynamicOutputsPayload {
  nodeId: string;
  outputs: Record<string, OutputInfo>;
}

interface AddDynamicInputsPayload {
  nodeId: string;
  groupId: string;
  inputs: ParameterInfo[];
}

export interface UpdateParametersPayload {
  nodeId: string;
  dependencies?: NodeDependencies;
  parameters: {
    groupId: string;
    parameterId: string;
    propertiesToUpdate: Partial<ParameterInfo>;
  }[];
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
        if (!nodeData) {
          return;
        }

        const { id, nodeInputs, nodeOutputs, nodeDependencies, settings } = nodeData;
        state.inputParameters[id] = nodeInputs;
        state.outputParameters[id] = nodeOutputs;
        state.dependencies[id] = nodeDependencies;

        if (settings) {
          state.settings[id] = settings;
        }
      }
    },
    addDynamicInputs: (state, action: PayloadAction<AddDynamicInputsPayload>) => {
      const { nodeId, groupId, inputs } = action.payload;
      if (state.inputParameters[nodeId] && state.inputParameters[nodeId].parameterGroups[groupId]) {
        state.inputParameters[nodeId].parameterGroups[groupId].parameters = [
          ...state.inputParameters[nodeId].parameterGroups[groupId].parameters,
          ...inputs,
        ];
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
    },
    updateNodeSettings: (state, action: PayloadAction<AddSettingsPayload>) => {
      const { id, settings } = action.payload;
      if (!state.settings[id]) {
        state.settings[id] = {};
      }

      state.settings[id] = { ...state.settings[id], ...settings };
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

      if (dependencies) {
        state.dependencies[nodeId] = dependencies;
      }
    },
    updateOutputs: (state, action: PayloadAction<{ id: string; nodeOutputs: NodeOutputs }>) => {
      const { id, nodeOutputs } = action.payload;
      if (state.outputParameters[id]) {
        state.outputParameters[id] = nodeOutputs;
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
        delete state.settings[id];
      }
    },
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
  updateOutputs,
  deinitializeOperationInfo,
  deinitializeNodes,
} = operationMetadataSlice.actions;

export default operationMetadataSlice.reducer;

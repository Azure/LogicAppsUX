import type { Settings } from '../../actions/bjsworkflow/settings';
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
}

export interface NodeInputs {
  isLoading?: boolean;
  parameterGroups: Record<string, ParameterGroup>;
}

export interface NodeOutputs {
  isLoading?: boolean;
  outputs: Record<string, OutputInfo>;
}

export interface OperationMetadataState {
  operationInfo: Record<string, NodeOperation>;
  inputParameters: Record<string, NodeInputs>;
  outputParameters: Record<string, NodeOutputs>;
  settings: Record<string, Settings>;
}

const initialState: OperationMetadataState = {
  operationInfo: {},
  inputParameters: {},
  outputParameters: {},
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
  settings?: Settings;
}
interface AddSettingsPayload {
  id: string;
  settings: Settings;
}

interface UpdateParameterPayload {
  nodeId: string;
  groupId: string;
  parameterId: string;
  propertiesToUpdate: Partial<ParameterInfo>;
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

        const { id, nodeInputs, nodeOutputs, settings } = nodeData;
        state.inputParameters[id] = nodeInputs;
        state.outputParameters[id] = nodeOutputs;
        if (settings) {
          state.settings[id] = settings;
        }
      }
    },
    updateNodeSettings: (state, action: PayloadAction<AddSettingsPayload>) => {
      const { id, settings } = action.payload;
      if (!state.settings[id]) {
        state.settings[id] = {};
      }

      state.settings[id] = { ...state.settings[id], ...settings };
    },
    updateNodeParameter: (state, action: PayloadAction<UpdateParameterPayload>) => {
      const { nodeId, groupId, parameterId, propertiesToUpdate } = action.payload;
      const nodeInputs = state.inputParameters[nodeId];

      if (nodeInputs) {
        const parameterGroup = nodeInputs.parameterGroups[groupId];
        const index = parameterGroup.parameters.findIndex((parameter) => parameter.id === parameterId);
        if (index > -1) {
          parameterGroup.parameters[index] = { ...parameterGroup.parameters[index], ...propertiesToUpdate };
          state.inputParameters[nodeId].parameterGroups[groupId] = parameterGroup;
        }
      }
    },
    updateOutputs: (state, action: PayloadAction<{ id: string; nodeOutputs: NodeOutputs }>) => {
      const { id, nodeOutputs } = action.payload;
      if (state.outputParameters[id]) {
        state.outputParameters[id] = nodeOutputs;
      }
    },
  },
});

// Action creators are generated for each case reducer function
export const { initializeNodes, initializeOperationInfo, updateNodeParameter, updateNodeSettings, updateOutputs } =
  operationMetadataSlice.actions;

export default operationMetadataSlice.reducer;

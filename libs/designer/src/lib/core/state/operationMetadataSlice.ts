import type { Settings } from '../actions/bjsworkflow/settings';
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
  operationInfo: Record<string, OperationInfo>;
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

interface AddOperationInfoPayload extends OperationInfo {
  id: string;
}

export interface NodeData {
  id: string;
  nodeInputs: NodeInputs;
  nodeOutputs: NodeOutputs;
  settings: Settings;
}

export const operationMetadataSlice = createSlice({
  name: 'operationMetadata',
  initialState,
  reducers: {
    initializeOperationInfo: (state, action: PayloadAction<AddOperationInfoPayload>) => {
      const { id, connectorId, operationId } = action.payload;
      state.operationInfo[id] = { connectorId, operationId };
    },
    initializeNodes: (state: any, action: PayloadAction<(NodeData | undefined)[]>) => {
      for (const nodeData of action.payload) {
        if (!nodeData) {
          return;
        }

        const { id, nodeInputs, nodeOutputs, settings } = nodeData;
        state.inputParameters[id] = nodeInputs;
        state.outputParameters[id] = nodeOutputs;
        state.settings[id] = settings;
      }
    },
  },
});

// Action creators are generated for each case reducer function
export const { initializeNodes, initializeOperationInfo } = operationMetadataSlice.actions;

export default operationMetadataSlice.reducer;

import type { ParameterInfo } from '@microsoft/designer-ui';
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface OperationInfo {
  connectorId: string;
  operationId: string;
}

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
}

const initialState: OperationMetadataState = {
  operationInfo: {},
  inputParameters: {},
  outputParameters: {},
};

interface AddOperationInfoPayload extends OperationInfo {
  id: string;
}

interface AddInputsPayload extends NodeInputs {
  id: string;
}

interface AddOutputsPayload extends NodeOutputs {
  id: string;
}

export const operationMetadataSlice = createSlice({
  name: 'operationMetadata',
  initialState,
  reducers: {
    initializeOperationInfo: (state, action: PayloadAction<AddOperationInfoPayload>) => {
      const { id, connectorId, operationId } = action.payload;
      state.operationInfo[id] = { connectorId, operationId };
    },
    initializeInputParameters: (state, action: PayloadAction<AddInputsPayload>) => {
      const { id, isLoading, parameterGroups } = action.payload;
      state.inputParameters[id] = { isLoading, parameterGroups };
    },
    initializeOutputParameters: (state, action: PayloadAction<AddOutputsPayload>) => {
      const { id, isLoading, outputs } = action.payload;
      state.outputParameters[id] = { isLoading, outputs };
    },
  },
});

// Action creators are generated for each case reducer function
export const { initializeInputParameters, initializeOperationInfo, initializeOutputParameters } = operationMetadataSlice.actions;

export default operationMetadataSlice.reducer;

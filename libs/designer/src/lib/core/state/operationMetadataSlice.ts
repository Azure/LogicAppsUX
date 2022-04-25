import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { ParameterInfo } from '@microsoft/designer-ui';

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

export interface NodeParameters {
  isLoading?: boolean;
  parameterGroups: Record<string, ParameterGroup>;
}

export interface OperationMetadataState {
  operationInfo: Record<string, OperationInfo>;
  inputParameters: Record<string, NodeParameters>;
}

const initialState: OperationMetadataState = {
  operationInfo: {},
  inputParameters: {},
};

interface AddOperationInfoPayload extends OperationInfo {
  id: string;
}

interface AddInputsParametersPayload extends NodeParameters {
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
    initializeInputParameters: (state, action: PayloadAction<AddInputsParametersPayload>) => {
      const { id, isLoading, parameterGroups } = action.payload;
      state.inputParameters[id] = { isLoading, parameterGroups };
    },
  },
});

// Action creators are generated for each case reducer function
export const { initializeOperationInfo, initializeInputParameters } = operationMetadataSlice.actions;

export default operationMetadataSlice.reducer;

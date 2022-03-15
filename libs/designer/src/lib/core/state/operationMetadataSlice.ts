import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface OperationInfo {
  connectorId: string;
  operationId: string;
}

export interface OperationMetadataState {
  operationInfo: Record<string, OperationInfo>;
}

const initialState: OperationMetadataState = {
  operationInfo: {}
};

interface AddOperationInfoPayload extends OperationInfo {
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
  }
});

// Action creators are generated for each case reducer function
export const { initializeOperationInfo } = operationMetadataSlice.actions;

export default operationMetadataSlice.reducer;


import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { configureStore } from '@reduxjs/toolkit';
import { listenerMiddleware } from '../actions/operationdeserializer';

export interface OperationInfo {
  connectorId: string;
  operationId: string;
}

export type Actions = Record<string, LogicAppsV2.ActionDefinition>;
export interface OperationState {
    operationInfo: Record<string, OperationInfo>;
}

const initialState: OperationState = {
  operationInfo: {}
};

interface AddOperationInfoPayload extends OperationInfo {
  id: string;
}

const operationMetadataSlice = createSlice({
  name: 'operationMetadata',
  initialState,
  reducers: {
    initializeOperationInfo: (state, action: PayloadAction<AddOperationInfoPayload>) => {
      const { id, connectorId, operationId } = action.payload;
      state.operationInfo[id] = { connectorId, operationId };
    },
  },
})
export const operationMetadataStore = configureStore({
  preloadedState: initialState,
  reducer: operationMetadataSlice.reducer,
  middleware: getDefaultMiddleware => getDefaultMiddleware().prepend(listenerMiddleware.middleware)
});

// Action creators are generated for each case reducer function
export const { initializeOperationInfo } = operationMetadataSlice.actions;

export default operationMetadataSlice.reducer;

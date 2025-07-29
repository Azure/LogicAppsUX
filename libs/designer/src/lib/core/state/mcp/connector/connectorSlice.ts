import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { resetMcpState } from '../../global';
import { initializeOperationsMetadata } from '../../../actions/bjsworkflow/mcp';

export interface McpSelectionState {
  selectedConnectorId: string | undefined;
  selectedOperations: string[];
  selectedOperationId?: string;
  errors: {
    operations?: string;
    operationDetails?: Record<string, { general?: string; parameters?: string }>;
  };
}

const initialSelectionState: McpSelectionState = {
  selectedConnectorId: undefined,
  selectedOperations: [],
  selectedOperationId: undefined,
  errors: {},
};

const clearAllSelectionsReducer = (state: typeof initialSelectionState) => {
  state.selectedConnectorId = undefined;
  state.selectedOperations = [];
};

export const connectorSlice = createSlice({
  name: 'connector',
  initialState: initialSelectionState,
  reducers: {
    selectConnectorId: (state, action: PayloadAction<string | undefined>) => {
      if (state.selectedConnectorId !== action.payload) {
        state.selectedOperations = [];
        state.selectedConnectorId = action.payload;
      }
    },
    selectOperations: (state, action: PayloadAction<string[]>) => {
      state.selectedOperations = action.payload;
    },
    selectOperationIdToEdit: (state, action: PayloadAction<string | undefined>) => {
      state.selectedOperationId = action.payload;
    },
    clearSelectedOperations: (state) => {
      state.selectedOperations = [];
    },
    clearAllSelections: clearAllSelectionsReducer,
  },
  extraReducers: (builder) => {
    builder.addCase(resetMcpState, () => initialSelectionState);
    builder.addCase(initializeOperationsMetadata.fulfilled, clearAllSelectionsReducer);
    builder.addCase(initializeOperationsMetadata.rejected, (state, action: PayloadAction<unknown>) => {
      if (typeof action.payload === 'string') {
        state.errors.operations = action.payload;
      }
    });
  },
});

export const { selectConnectorId, selectOperations, clearSelectedOperations, clearAllSelections, selectOperationIdToEdit } =
  connectorSlice.actions;

export default connectorSlice.reducer;

import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { resetMcpState } from '../global';
import { initializeOperationsMetadata } from '../../../core/actions/bjsworkflow/mcp';

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
  state.errors.operations = undefined;
};

export const mcpSelectionSlice = createSlice({
  name: 'mcpSelection',
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
    builder.addCase(initializeOperationsMetadata.rejected, (state, action) => {
      state.errors.operations = action.error.message ?? 'Failed to initialize operation details.';
    });
  },
});

export const { selectConnectorId, selectOperations, clearSelectedOperations, clearAllSelections, selectOperationIdToEdit } =
  mcpSelectionSlice.actions;

export default mcpSelectionSlice.reducer;
